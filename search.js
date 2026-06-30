// ═══════════════════════════════════════════════════════
// FILE / FOLDER PICKER
// HTML5 File API picks files (native Android picker UI).
// Each picked file is then COPIED into the app's permanent
// storage directory via Capacitor Filesystem, so the
// resulting file:// path survives app restarts — unlike
// blob: URLs from URL.createObjectURL(), which die the
// instant the WebView is destroyed.
// ═══════════════════════════════════════════════════════

const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());
const AUDIO_EXTS = new Set(['mp3','flac','wav','aac','ogg','m4a','opus','wma','aiff','ape']);
const MUSIC_DIR_NAME = 'AuraMusicLibrary';

function stripExt(n){ return n.replace(/\.[^.]+$/, ''); }

function pickFolder(){
  document.getElementById('folder-picker').click();
}
function pickFiles(){
  document.getElementById('file-picker').click();
}

async function onFilePicked(input){
  const files = Array.from(input.files || []);
  const audio = files.filter(f => AUDIO_EXTS.has(f.name.split('.').pop().toLowerCase()));

  if(!audio.length){ showSnack('No audio files in selection'); input.value = ''; return; }

  showSnack(`Adding ${audio.length} song${audio.length>1?'s':''}…`);

  const existingIds = new Set(state.tracks.map(t => t.id));
  let added = 0;
  let failed = 0;

  for(const file of audio){
    const id = file.name + '_' + file.size + '_' + file.lastModified;
    if(existingIds.has(id)) continue;

    const bare = stripExt(file.name);
    let title = bare, artist = 'Unknown Artist';
    const m = bare.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if(m){ artist = m[1].trim(); title = m[2].trim(); }

    const parts = (file.webkitRelativePath || file.name).split('/');
    const album = parts.length > 1 ? parts[parts.length - 2] : 'Unknown Album';

    let url;
    if(IS_NATIVE){
      // Copy into permanent app storage so it survives restarts
      url = await _persistFileToStorage(file, id);
      if(!url){ failed++; continue; }
    } else {
      // Browser preview / non-native fallback — blob is fine here
      url = URL.createObjectURL(file);
    }

    state.tracks.push({ id, title, artist, album, url, thumb: null, duration: 0, genre: '', source: 'local' });
    existingIds.add(id);
    added++;
  }

  input.value = '';

  if(added){
    saveTracksToStorage();
    renderAll();
    let msg = `Added ${added} song${added>1?'s':''} 🎵`;
    if(failed) msg += ` (${failed} failed)`;
    showSnack(msg);
    if(!state.isPlaying) playTrack(0);
  } else if(failed){
    showSnack(`Could not add ${failed} file${failed>1?'s':''} — storage error`);
  } else {
    showSnack('All selected files already in library');
  }
}

// ── Copy a picked File into permanent app storage ─────
// Returns a stable file:// URI, or null on failure.
async function _persistFileToStorage(file, id){
  const FS = window.Capacitor?.Plugins?.Filesystem;
  if(!FS){ return URL.createObjectURL(file); } // fallback if plugin missing

  try{
    const buffer = await file.arrayBuffer();
    const base64 = _arrayBufferToBase64(buffer);
    const safeName = id.replace(/[^a-zA-Z0-9._-]/g, '_') + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${MUSIC_DIR_NAME}/${safeName}`;

    await FS.writeFile({
      path,
      data: base64,
      directory: 'Data',     // app-private persistent storage
      recursive: true,
    });

    const uriResult = await FS.getUri({ path, directory: 'Data' });
    return uriResult.uri;
  }catch(e){
    console.warn('Persist file error:', e);
    return null;
  }
}

function _arrayBufferToBase64(buffer){
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for(let i = 0; i < bytes.length; i += chunkSize){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// ── Persist metadata across restarts ──────────────────
// Local tracks now use durable file:// URIs (from Filesystem),
// so they're saved just like Drive tracks — only the dead
// blob: URL case is excluded.
function saveTracksToStorage(){
  try{
    const meta = state.tracks
      .filter(t => !(t.url && t.url.startsWith('blob:'))) // exclude dead blob URLs
      .map(t => ({
        id:t.id, fileId:t.fileId, title:t.title, artist:t.artist,
        album:t.album, url:t.streamUrl||t.url, streamUrl:t.streamUrl,
        thumb:t.thumb, duration:t.duration, genre:t.genre, source:t.source,
      }));
    localStorage.setItem('aura_tracks_v1', JSON.stringify(meta));
  }catch(e){ console.warn('saveTracksToStorage error:', e); }
}

function loadTracksFromStorage(){
  try{
    const raw = localStorage.getItem('aura_tracks_v1');
    if(!raw) return;
    state.tracks = JSON.parse(raw);
  }catch(e){ console.warn('loadTracksFromStorage error:', e); }
}

// ── Remove a track and its stored file (Settings → Clear Library) ─
async function deleteStoredTrack(track){
  if(track.source !== 'local' || !track.url || !track.url.startsWith('file://')) return;
  const FS = window.Capacitor?.Plugins?.Filesystem;
  if(!FS) return;
  try{
    const relPath = track.url.split(`${MUSIC_DIR_NAME}/`)[1];
    if(relPath) await FS.deleteFile({ path: `${MUSIC_DIR_NAME}/${relPath}`, directory: 'Data' });
  }catch(e){ console.warn('deleteStoredTrack error:', e); }
}
