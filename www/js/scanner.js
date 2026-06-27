// ═══════════════════════════════════════════════════════
// LOCAL MUSIC SCANNING
// Strategy:
//   Android 13+  → READ_MEDIA_AUDIO permission
//   Android ≤12  → READ_EXTERNAL_STORAGE permission
//   Uses Capacitor Filesystem to walk /Music, /Download,
//   /sdcard and external SD card paths directly.
//   Falls back to Android MediaStore query via a custom
//   Capacitor plugin bridge injected by the native layer.
// ═══════════════════════════════════════════════════════

const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const AUDIO_EXTS = new Set(['mp3','flac','wav','aac','ogg','m4a','opus','wma','aiff','ape']);

// Paths to scan — includes internal + common SD card mounts
const SCAN_PATHS = [
  'Music', 'Download', 'Downloads', 'DCIM', 'Ringtones',
  'Podcasts', 'Notifications', 'Alarms',
];
// External SD card root labels Android uses
const SD_ROOTS = [
  '/storage/sdcard1', '/storage/sdcard2',
  '/storage/extSdCard', '/storage/external_sd',
  '/mnt/sdcard1', '/mnt/extSdCard',
];

async function scanLocalMusic(){
  const btn = document.getElementById('library-scan-btn');
  const msg = document.getElementById('library-empty-msg');
  btn.textContent = 'Scanning…';
  msg.textContent = 'Reading your music library…';

  try {
    if(IS_NATIVE){
      await scanNativeMusic();
    } else {
      btn.textContent = 'Scan Device';
      msg.textContent = 'Install the APK on your phone to scan music';
      showSnack('Open this as an APK to scan device music');
    }
  } catch(e){
    console.error('Scan error:', e);
    btn.textContent = 'Retry Scan';
    msg.textContent = 'Scan failed — tap to retry';
    showSnack('Scan error: ' + (e.message || String(e)));
  }
}

async function scanNativeMusic(){
  const Plugins   = window.Capacitor.Plugins;
  const FS        = Plugins.Filesystem;
  const AuraBridge = Plugins.AuraBridge; // injected by native layer (see below)

  // ── Step 1: Request storage permission ───────────────
  let permOk = false;
  if(Plugins.Permissions){
    try{
      // Android 13+
      let r = await Plugins.Permissions.query({ name:'read-media-audio' }).catch(()=>null);
      if(r && r.state === 'granted'){ permOk = true; }
      else {
        r = await Plugins.Permissions.request({ name:'read-media-audio' }).catch(()=>null);
        if(r && r.state === 'granted') permOk = true;
      }
      if(!permOk){
        // Android ≤12 fallback
        r = await Plugins.Permissions.query({ name:'read-external-storage' }).catch(()=>null);
        if(r && r.state === 'granted') permOk = true;
        else {
          r = await Plugins.Permissions.request({ name:'read-external-storage' }).catch(()=>null);
          if(r && r.state === 'granted') permOk = true;
        }
      }
    }catch(e){ permOk = true; /* try anyway */ }
  } else { permOk = true; }

  if(!permOk){
    showSnack('Storage permission denied — grant it in App Settings');
    document.getElementById('library-scan-btn').textContent = 'Retry Scan';
    document.getElementById('library-empty-msg').textContent = 'Permission denied. Go to Settings → Apps → Aura Music → Permissions';
    return;
  }

  // ── Step 2: Try AuraBridge MediaStore query first ─────
  // This is the most reliable — reads Android MediaStore directly
  let foundTracks = [];
  if(AuraBridge){
    try{
      const res = await AuraBridge.getAudioFiles({ includeExternal: true });
      foundTracks = (res.files || []).map(f => ({
        id:       f.id   || f.path,
        title:    f.title  || stripExt(f.path.split('/').pop()),
        artist:   f.artist || 'Unknown Artist',
        album:    f.album  || 'Unknown Album',
        url:      f.path.startsWith('file://') ? f.path : 'file://' + f.path,
        thumb:    f.albumArt || null,
        duration: Number(f.duration || 0),
        genre:    f.genre || '',
        source:   f.isExternal ? 'sdcard' : 'local',
      }));
    }catch(e){ console.warn('AuraBridge unavailable, falling back to FS scan', e); }
  }

  // ── Step 3: Filesystem walk fallback ──────────────────
  if(!foundTracks.length && FS){
    // Internal storage
    for(const dir of SCAN_PATHS){
      const batch = await walkDir(FS, dir, 'ExternalStorage').catch(()=>[]);
      foundTracks.push(...batch);
    }
    // External SD card
    for(const root of SD_ROOTS){
      for(const dir of SCAN_PATHS){
        const batch = await walkDir(FS, root+'/'+dir, 'ExternalStorage').catch(()=>[]);
        foundTracks.push(...batch);
      }
      // Also scan SD root itself (some phones put music in /storage/sdcard1/Music)
      const batch = await walkDir(FS, root, 'ExternalStorage').catch(()=>[]);
      foundTracks.push(...batch);
    }
  }

  if(!foundTracks.length){
    document.getElementById('library-scan-btn').textContent = 'Scan Device';
    document.getElementById('library-empty-msg').textContent = 'No audio files found. Check that music files are on the device.';
    showSnack('No music found on device or SD card');
    return;
  }

  // ── Step 4: Merge into library (skip duplicates) ──────
  const existingIds = new Set(state.tracks.map(t => t.id));
  const newTracks   = foundTracks.filter(t => !existingIds.has(t.id));
  state.tracks.push(...newTracks);

  if(newTracks.length){
    saveTracksToStorage();
    renderAll();
    showSnack(`Found ${newTracks.length} song${newTracks.length>1?'s':''} 🎵`);
    if(!state.isPlaying) playTrack(0);
  } else {
    showSnack('Library already up to date');
  }
  document.getElementById('library-scan-btn').textContent = 'Scan Device';
}

// Recursive directory walker using Capacitor Filesystem
async function walkDir(FS, path, directory, depth=0){
  if(depth > 4) return []; // safety limit
  let result = [];
  try{
    const ls = await FS.readdir({ path, directory });
    const entries = ls.files || [];
    for(const entry of entries){
      const entryPath = path + '/' + (entry.name || entry);
      const name = (entry.name || entry);
      const isDir = entry.type === 'directory' || (!name.includes('.') && depth < 3);
      if(isDir){
        const sub = await walkDir(FS, entryPath, directory, depth+1).catch(()=>[]);
        result.push(...sub);
      } else {
        const ext = name.split('.').pop().toLowerCase();
        if(AUDIO_EXTS.has(ext)){
          // Build file:// URL
          let url = '';
          try{
            const uriRes = await FS.getUri({ path: entryPath, directory });
            url = uriRes.uri || '';
          }catch(e){ url = 'file:///storage/emulated/0/' + entryPath; }
          const bare  = name.replace(/\.[^.]+$/, '');
          // Try "Artist - Title" split from filename
          let title = bare, artist = 'Unknown Artist';
          const m = bare.match(/^(.+?)\s*[-–]\s*(.+)$/);
          if(m){ artist = m[1].trim(); title = m[2].trim(); }
          result.push({
            id:       url || entryPath,
            title,
            artist,
            album:    path.split('/').pop() || 'Unknown Album',
            url,
            thumb:    null,
            duration: 0,
            genre:    '',
            source:   path.includes('sdcard') || path.includes('extSd') ? 'sdcard' : 'local',
          });
        }
      }
    }
  }catch(e){ /* directory unreadable — skip */ }
  return result;
}

function stripExt(name){ return name.replace(/\.[^.]+$/, ''); }

// Persist track metadata across sessions
function saveTracksToStorage(){
  try{
    const meta = state.tracks.map(t=>({
      id:t.id, title:t.title, artist:t.artist,
      album:t.album, url:t.url, thumb:t.thumb,
      duration:t.duration, genre:t.genre, source:t.source,
    }));
    localStorage.setItem('aura_tracks_v1', JSON.stringify(meta));
  }catch(e){ console.warn('Save tracks error:', e); }
}

function loadTracksFromStorage(){
  try{
    const raw = localStorage.getItem('aura_tracks_v1');
    if(!raw) return;
    state.tracks = JSON.parse(raw);
  }catch(e){ console.warn('Load tracks error:', e); }
}

const DEMO_TRACKS = [];

