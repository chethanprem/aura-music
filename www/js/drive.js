// ═══════════════════════════════════════════════════════
// GOOGLE DRIVE
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// GOOGLE DRIVE — Real OAuth2 + Drive API v3
//
// SETUP (one-time):
//   1. Go to https://console.cloud.google.com
//   2. Create project → Enable "Google Drive API"
//   3. OAuth consent screen → External → add scope:
//      https://www.googleapis.com/auth/drive.readonly
//   4. Credentials → OAuth 2.0 Client ID → Web application
//      Authorised JavaScript origins: https://localhost
//      (Capacitor uses https://localhost internally)
//   5. Copy the Client ID and paste below ↓
// ═══════════════════════════════════════════════════════
const DRIVE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';
const DRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.readonly email profile';
const DRIVE_API       = 'https://www.googleapis.com/drive/v3';

let driveTokenClient = null;
let driveAccessToken = '';

// Lazy-load Google Identity Services script
function loadGSI(){
  return new Promise((resolve, reject)=>{
    if(window.google && window.google.accounts){ resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = ()=> reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
}

function openDriveModal(){
  document.getElementById('drive-modal').classList.add('open');
}
function closeDriveModal(e){
  if(!e || e.target === document.getElementById('drive-modal'))
    document.getElementById('drive-modal').classList.remove('open');
}

async function toggleDriveConnect(){
  if(state.driveConnected){
    if(!confirm('Disconnect Google Drive?')) return;
    driveAccessToken = '';
    state.driveConnected = false;
    state.driveEmail = '';
    // Remove Drive tracks from library
    state.tracks = state.tracks.filter(t => t.source !== 'drive');
    saveTracksToStorage();
    updateDriveUI();
    saveState();
    renderAll();
    showSnack('Google Drive disconnected');
    return;
  }

  if(DRIVE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com'){
    showSnack('Add your Google Client ID in index.html first');
    return;
  }

  document.getElementById('drive-badge').textContent = '⏳';
  try{
    await loadGSI();
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (tokenResponse)=>{
        if(tokenResponse.error){ showSnack('Sign-in failed: ' + tokenResponse.error); updateDriveUI(); return; }
        driveAccessToken = tokenResponse.access_token;
        // Get user info
        const me = await driveRequest('/about?fields=user');
        state.driveConnected = true;
        state.driveEmail = me.user?.emailAddress || '';
        updateDriveUI();
        saveState();
        showSnack('Google Drive connected ✓');
        // Auto-sync immediately
        await syncDriveFolders();
      },
    });
    driveTokenClient.requestAccessToken({ prompt: 'consent' });
  }catch(e){
    showSnack('Drive connect failed: ' + e.message);
    updateDriveUI();
  }
}

// Make an authenticated Drive API request
async function driveRequest(path, params={}){
  const qs = new URLSearchParams(params).toString();
  const url = DRIVE_API + path + (qs ? '?' + qs : '');
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + driveAccessToken }
  });
  if(!res.ok) throw new Error('Drive API error ' + res.status);
  return res.json();
}

// Fetch ALL audio files from Drive (all folders, including shared)
async function syncDriveFolders(){
  if(!state.driveConnected || !driveAccessToken){
    showSnack('Connect Google Drive first');
    return;
  }
  const sub = document.getElementById('last-sync-text');
  sub.textContent = 'Syncing…';
  showSnack('Scanning Google Drive for music…');

  try{
    const audioMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/wav',
      'audio/aac', 'audio/ogg', 'audio/x-m4a', 'audio/mp4',
      'audio/opus', 'audio/x-wav',
    ];
    const mimeQuery = audioMimes.map(m=>`mimeType='${m}'`).join(' or ');
    const q = `(${mimeQuery}) and trashed=false`;

    let allFiles = [];
    let pageToken = '';
    // Page through all results (Drive returns max 1000 per page)
    do {
      const params = {
        q,
        fields: 'nextPageToken,files(id,name,size,mimeType,modifiedTime,parents)',
        pageSize: 1000,
        orderBy: 'name',
        ...(pageToken ? { pageToken } : {}),
      };
      const res = await driveRequest('/files', params);
      allFiles.push(...(res.files || []));
      pageToken = res.nextPageToken || '';
    } while(pageToken);

    if(!allFiles.length){
      sub.textContent = 'No audio files in Drive';
      showSnack('No music found in Google Drive');
      return;
    }

    // Get folder names for album metadata (batch the parent IDs)
    const parentIds = [...new Set(allFiles.flatMap(f=>f.parents||[]))];
    const folderNames = {};
    for(const pid of parentIds.slice(0,50)){ // cap at 50 folder lookups
      try{
        const f = await driveRequest('/files/'+pid, { fields:'name' });
        folderNames[pid] = f.name || 'Drive';
      }catch(e){ folderNames[pid] = 'Drive'; }
    }

    // Remove old Drive tracks then re-add fresh ones
    state.tracks = state.tracks.filter(t => t.source !== 'drive');
    const existingIds = new Set(state.tracks.map(t=>t.id));

    for(const file of allFiles){
      if(existingIds.has(file.id)) continue;
      const bare   = file.name.replace(/\.[^.]+$/,'');
      let title = bare, artist = 'Google Drive';
      const m = bare.match(/^(.+?)\s*[-–]\s*(.+)$/);
      if(m){ artist = m[1].trim(); title = m[2].trim(); }
      const album = file.parents?.[0] ? (folderNames[file.parents[0]] || 'Drive') : 'Drive';
      // Streaming URL — Drive serves audio directly with auth header
      // We store the file ID and construct the URL at play time with the token
      const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${driveAccessToken}`;
      state.tracks.push({
        id:       file.id,
        title,
        artist,
        album,
        url,
        thumb:    null,
        duration: 0,
        genre:    '',
        source:   'drive',
        driveId:  file.id,
      });
    }

    saveTracksToStorage();
    renderAll();
    const now = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    sub.textContent = `Last synced: ${now} · ${allFiles.length} files`;
    showSnack(`Loaded ${allFiles.length} songs from Drive 🎵`);

  }catch(e){
    sub.textContent = 'Sync failed';
    showSnack('Drive sync failed: ' + e.message);
  }
}

// Refresh Drive track URLs before playing (tokens expire in 1h)
function refreshDriveUrl(track){
  if(track.source === 'drive' && driveAccessToken && track.driveId){
    track.url = `https://www.googleapis.com/drive/v3/files/${track.driveId}?alt=media&access_token=${driveAccessToken}`;
  }
  return track;
}

function updateDriveUI(){
  const c = state.driveConnected;
  document.getElementById('drive-badge').textContent = c ? 'On' : 'Off';
  document.getElementById('drive-badge').className = 'drive-status-badge ' + (c ? 'badge-connected' : 'badge-disconnected');
  document.getElementById('drive-card-title').textContent = c ? 'Google Drive Connected' : 'Connect Google Drive';
  document.getElementById('drive-card-sub').textContent = c ? state.driveEmail : 'Access music stored in Drive';
  document.getElementById('drive-connected-options').style.display = c ? '' : 'none';
  document.getElementById('drive-settings-status').textContent = c ? 'Synced · ' + state.driveEmail : 'Not connected';
  document.getElementById('drive-lib-status').textContent = c ? 'Linked · ' + state.driveEmail : 'Not linked';
}

async function manageDriveFolders(){
  if(!state.driveConnected){ showSnack('Connect Drive first'); return; }
  // Show folder picker using Drive API
  try{
    const res = await driveRequest('/files', {
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id,name)',
      pageSize: 20,
      orderBy: 'name',
    });
    const folders = res.files || [];
    if(!folders.length){ showSnack('No folders found in Drive'); return; }
    const names = folders.map((f,i)=>`${i+1}. ${f.name}`).join('
');
    const choice = prompt('Select a folder to sync:
' + names + '

Enter number (or leave blank to sync all):');
    if(choice === null) return;
    const idx = parseInt(choice) - 1;
    if(idx >= 0 && idx < folders.length){
      document.getElementById('drive-folders-text').textContent = folders[idx].name;
    } else {
      document.getElementById('drive-folders-text').textContent = 'All folders';
    }
    showSnack('Syncing…');
    await syncDriveFolders();
  }catch(e){ showSnack('Could not load folders: ' + e.message); }
}

function toggleAutoSync(){
  const cb = document.getElementById('autosync-toggle');
  cb.checked = !cb.checked;
  showSnack('Auto-sync ' + (cb.checked ? 'enabled' : 'disabled'));
  saveState();
}

