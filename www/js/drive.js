// ═══════════════════════════════════════════════════════
// GOOGLE DRIVE — OAuth2 via system browser (works in WebViews)
//
// WHY NOT Google Identity Services (GSI popup)?
//   GSI's initTokenClient() opens a JS popup window, which
//   Android WebViews (Capacitor included) do not support —
//   it silently fails with "Could not load Google Sign-In".
//
// HOW THIS WORKS INSTEAD:
//   1. User taps "Sign in with Google"
//   2. App opens Google's OAuth page in the SYSTEM BROWSER
//      (Chrome Custom Tabs) via @capacitor/browser
//   3. After consent, Google redirects to a custom URL scheme
//      (com.auramusic.app://oauth) which Android hands back
//      to THIS app via @capacitor/app's appUrlOpen listener
//   4. The access token arrives in the URL fragment — we
//      parse and store it
//
// SETUP (one-time):
//   • console.cloud.google.com → your project
//   • Credentials → OAuth 2.0 Client ID → Web app
//   • Authorised redirect URI: com.auramusic.app:/oauth
//     (note: Android intent scheme uses single slash here)
//   • Paste the Client ID into DRIVE_CLIENT_ID below
// ═══════════════════════════════════════════════════════

const DRIVE_CLIENT_ID = '26269732178-ainj1cfg4657q7amh0uu96vhse3o4dit.apps.googleusercontent.com';
const DRIVE_REDIRECT_URI = 'com.auramusic.app:/oauth';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly email profile';
const DRIVE_API   = 'https://www.googleapis.com/drive/v3';
const TOKEN_KEY   = 'aura_drive_token';

let _driveToken = '';
let _driveSignInPending = false;

// ── Token persistence ────────────────────────────────
function saveDriveToken(token){
  _driveToken = token;
  try{ localStorage.setItem(TOKEN_KEY, token); }catch(e){}
}
function loadDriveToken(){
  try{ _driveToken = localStorage.getItem(TOKEN_KEY) || ''; }catch(e){}
  return _driveToken;
}
function clearDriveToken(){
  _driveToken = '';
  try{ localStorage.removeItem(TOKEN_KEY); }catch(e){}
}

// ── Open Google OAuth in the system browser ───────────
async function startDriveOAuth(){
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', DRIVE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', DRIVE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', DRIVE_SCOPE);
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('prompt', 'consent');

  const { Browser } = window.Capacitor?.Plugins || {};
  if(!Browser){
    showSnack('Browser plugin not available — rebuild the app');
    return;
  }
  _driveSignInPending = true;
  await Browser.open({ url: authUrl.toString() });
}

// ── Called when Android hands the redirect back to the app ─
// Wired up in init.js via App.addListener('appUrlOpen', ...)
function handleDriveOAuthCallback(url){
  if(!url || !url.startsWith(DRIVE_REDIRECT_URI)) return false;

  // Close the system browser tab if still open
  try{ window.Capacitor?.Plugins?.Browser?.close(); }catch(e){}

  // Token comes back as a URL fragment: ...#access_token=XXX&...
  const hashIndex = url.indexOf('#');
  if(hashIndex === -1){
    showSnack('Sign-in failed: no token in redirect');
    _driveSignInPending = false;
    return true;
  }
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const token = params.get('access_token');
  const err   = params.get('error');

  if(err){
    showSnack('Sign-in failed: ' + err);
    _driveSignInPending = false;
    return true;
  }
  if(!token){
    showSnack('Sign-in failed: no access token received');
    _driveSignInPending = false;
    return true;
  }

  saveDriveToken(token);
  driveRequest('/about', { fields: 'user' }).then(me => {
    state.driveConnected = true;
    state.driveEmail = me.user?.emailAddress || 'Connected';
    saveState();
    updateDriveUI();
    showSnack('Google Drive connected ✓');
  }).catch(e => {
    showSnack('Connected, but could not fetch profile: ' + e.message);
    state.driveConnected = true;
    saveState();
    updateDriveUI();
  }).finally(() => {
    _driveSignInPending = false;
  });

  return true;
}

// ── Drive API request helper ─────────────────────────
async function driveRequest(path, params = {}){
  const url = new URL(DRIVE_API + path);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + _driveToken }
  });
  if(res.status === 401){ clearDriveToken(); updateDriveUI(); throw new Error('Token expired'); }
  if(!res.ok) throw new Error('Drive API error ' + res.status);
  return res.json();
}

// ── Modal open/close ─────────────────────────────────
function openDriveModal(){
  document.getElementById('drive-modal').classList.add('open');
  updateDriveUI();
}
function closeDriveModal(e){
  if(!e || e.target === document.getElementById('drive-modal'))
    document.getElementById('drive-modal').classList.remove('open');
}

// ── Update modal UI based on connection state ─────────
function updateDriveUI(){
  const connected = state.driveConnected;
  const connectBtn     = document.getElementById('drive-connect-btn');
  const browseBtn      = document.getElementById('drive-browse-btn');
  const disconnectBtn  = document.getElementById('drive-disconnect-btn');
  const connectedCard  = document.getElementById('drive-connected-card');
  const emailLabel     = document.getElementById('drive-email-label');
  const driveSettingsStatus = document.getElementById('drive-settings-status');

  if(connectBtn)    connectBtn.style.display    = connected ? 'none' : '';
  if(browseBtn)     browseBtn.style.display     = connected ? '' : 'none';
  if(disconnectBtn) disconnectBtn.style.display = connected ? '' : 'none';
  if(connectedCard) connectedCard.style.display = connected ? '' : 'none';
  if(emailLabel)    emailLabel.textContent       = state.driveEmail || '';
  if(driveSettingsStatus) driveSettingsStatus.textContent = connected ? 'Synced · ' + state.driveEmail : 'Not connected';
}

// ── Sign in ──────────────────────────────────────────
async function toggleDriveConnect(){
  if(_driveSignInPending){ showSnack('Sign-in already in progress…'); return; }

  const btn = document.getElementById('drive-connect-btn');

  // Try to restore saved token first
  const saved = loadDriveToken();
  if(saved){
    _driveToken = saved;
    if(btn){ btn.textContent = '⏳ Checking…'; btn.disabled = true; }
    try{
      const me = await driveRequest('/about', { fields: 'user' });
      state.driveConnected = true;
      state.driveEmail = me.user?.emailAddress || 'Connected';
      saveState();
      updateDriveUI();
      showSnack('Google Drive connected ✓');
      if(btn){ btn.textContent = '☁️ Sign in with Google'; btn.disabled = false; }
      return;
    }catch(e){
      clearDriveToken();
    }
    if(btn){ btn.textContent = '☁️ Sign in with Google'; btn.disabled = false; }
  }

  // Fresh sign-in via system browser
  try{
    if(btn){ btn.textContent = '⏳ Opening sign-in…'; btn.disabled = true; }
    await startDriveOAuth();
    showSnack('Complete sign-in in the browser, then return to the app');
  }catch(e){
    showSnack('Could not open sign-in: ' + (e.message || String(e)));
    _driveSignInPending = false;
  }
  if(btn){ btn.textContent = '☁️ Sign in with Google'; btn.disabled = false; }
}

// ── Disconnect ───────────────────────────────────────
function disconnectDrive(){
  if(!confirm('Disconnect Google Drive?\nDrive tracks will be removed from library.')) return;
  clearDriveToken();
  state.driveConnected = false;
  state.driveEmail = '';
  state.tracks = state.tracks.filter(t => t.source !== 'drive');
  saveTracksToStorage();
  saveState();
  updateDriveUI();
  renderAll();
  showSnack('Google Drive disconnected');
}

// ── Browse folders ───────────────────────────────────
async function browseDriveFolders(){
  if(!_driveToken){ showSnack('Not signed in'); return; }
  document.getElementById('drive-modal').classList.remove('open');
  showSnack('Loading Drive folders…');

  try{
    // List folders the user owns
    const res = await driveRequest('/files', {
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: '30',
    });

    const folders = res.files || [];
    if(!folders.length){ showSnack('No folders found in Drive'); return; }

    // Show a simple folder picker
    showFolderPicker(folders);
  }catch(e){
    showSnack('Drive error: ' + (e.message || String(e)));
  }
}

// ── Simple folder picker UI ──────────────────────────
function showFolderPicker(folders){
  // Remove any existing picker
  document.getElementById('folder-picker-sheet')?.remove();

  const sheet = document.createElement('div');
  sheet.id = 'folder-picker-sheet';
  sheet.className = 'ctx-overlay open';
  sheet.style.zIndex = '500';
  sheet.innerHTML = `
    <div class="ctx-sheet" style="max-height:70vh;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);">
        <p style="font-weight:700;font-size:.95rem;">Pick a Drive Folder</p>
        <button onclick="document.getElementById('folder-picker-sheet').remove()" style="color:var(--muted);font-size:1.2rem;background:none;border:none;cursor:pointer;">✕</button>
      </div>
      <div style="overflow-y:auto;flex:1;">
        ${folders.map(f => `
          <div class="ctx-item" onclick="loadDriveFolder('${f.id}','${f.name.replace(/'/g,"\\'")}')">
            <span style="font-size:1.2rem;">📁</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
          </div>`).join('')}
      </div>
    </div>`;
  document.getElementById('app').appendChild(sheet);
}

// ── Load audio files from a Drive folder ─────────────
async function loadDriveFolder(folderId, folderName){
  document.getElementById('folder-picker-sheet')?.remove();
  showSnack('Loading "' + folderName + '"…');

  try{
    const AUDIO_MIMES = [
      'audio/mpeg','audio/mp3','audio/flac','audio/wav',
      'audio/ogg','audio/aac','audio/m4a','audio/x-m4a',
      'audio/opus','audio/webm',
    ].map(m => `mimeType='${m}'`).join(' or ');

    const res = await driveRequest('/files', {
      q: `(${AUDIO_MIMES}) and '${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,size,modifiedTime)',
      pageSize: '200',
      orderBy: 'name',
    });

    const files = res.files || [];
    if(!files.length){ showSnack('No audio files in "' + folderName + '"'); return; }

    const existingIds = new Set(state.tracks.map(t => t.id));
    let added = 0;

    files.forEach(f => {
      if(existingIds.has('drive_' + f.id)) return;
      const bare = f.name.replace(/\.[^.]+$/, '');
      let title = bare, artist = 'Unknown Artist', album = folderName;
      const m = bare.match(/^(.+?)\s*[-–]\s*(.+)$/);
      if(m){ artist = m[1].trim(); title = m[2].trim(); }
      // Streaming URL — requires token in header, so we fetch via proxy function
      const url = `${DRIVE_API}/files/${f.id}?alt=media`;
      state.tracks.push({
        id: 'drive_' + f.id,
        fileId: f.id,
        title, artist, album,
        url,           // used with Authorization header via fetch
        streamUrl: url,
        thumb: null, duration: 0, genre: '', source: 'drive',
      });
      existingIds.add('drive_' + f.id);
      added++;
    });

    if(added){
      saveTracksToStorage();
      renderAll();
      showSnack(`Added ${added} song${added>1?'s':''} from "${folderName}" ☁️`);
    } else {
      showSnack('All files already in library');
    }
  }catch(e){
    showSnack('Load error: ' + (e.message || String(e)));
  }
}

// ── Refresh Drive stream URL before play ─────────────
// Drive needs Bearer token — we create a blob URL on-the-fly
async function refreshDriveUrl(track){
  if(!_driveToken || !track.fileId) return;
  try{
    const res = await fetch(`${DRIVE_API}/files/${track.fileId}?alt=media`, {
      headers: { Authorization: 'Bearer ' + _driveToken }
    });
    if(!res.ok) throw new Error('Stream fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    // Revoke old blob if any
    if(track._blobUrl) URL.revokeObjectURL(track._blobUrl);
    track._blobUrl = blobUrl;
    track.url = blobUrl;
  }catch(e){
    showSnack('Cannot stream Drive track — check connection');
    console.warn('Drive stream error:', e);
  }
}
