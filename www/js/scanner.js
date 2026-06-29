// ═══════════════════════════════════════════════════════
// FILE / FOLDER PICKER
// HTML5 File API — works on Android Capacitor WebView.
// User picks files or a whole folder. No permissions
// dialog needed — Android grants access via the picker.
// ═══════════════════════════════════════════════════════

const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.());
const AUDIO_EXTS = new Set(['mp3','flac','wav','aac','ogg','m4a','opus','wma','aiff','ape']);

function stripExt(n){ return n.replace(/\.[^.]+$/, ''); }

function pickFolder(){
  document.getElementById('folder-picker').click();
}
function pickFiles(){
  document.getElementById('file-picker').click();
}

function onFilePicked(input){
  const files = Array.from(input.files || []);
  const audio = files.filter(f => AUDIO_EXTS.has(f.name.split('.').pop().toLowerCase()));

  if(!audio.length){ showSnack('No audio files in selection'); input.value = ''; return; }

  const existingIds = new Set(state.tracks.map(t => t.id));
  let added = 0;

  audio.forEach(file => {
    const id = file.name + '_' + file.size + '_' + file.lastModified;
    if(existingIds.has(id)) return;

    const url = URL.createObjectURL(file);
    const bare = stripExt(file.name);
    let title = bare, artist = 'Unknown Artist';
    const m = bare.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if(m){ artist = m[1].trim(); title = m[2].trim(); }

    // Folder name as album (from webkitRelativePath)
    const parts = (file.webkitRelativePath || file.name).split('/');
    const album = parts.length > 1 ? parts[parts.length - 2] : 'Unknown Album';

    state.tracks.push({ id, title, artist, album, url, thumb: null, duration: 0, genre: '', source: 'local', _file: file });
    existingIds.add(id);
    added++;
  });

  input.value = '';

  if(added){
    saveTracksToStorage();
    renderAll();
    showSnack(`Added ${added} song${added>1?'s':''} 🎵`);
    if(!state.isPlaying) playTrack(0);
  } else {
    showSnack('All selected files already in library');
  }
}

// ── Persist metadata (blob URLs die on reload, so filter) ─
function saveTracksToStorage(){
  try{
    const meta = state.tracks
      .filter(t => t.source === 'drive') // only drive tracks survive reload (re-stream)
      .map(t => ({ id:t.id, fileId:t.fileId, title:t.title, artist:t.artist, album:t.album, url:t.streamUrl||t.url, streamUrl:t.streamUrl, thumb:t.thumb, duration:t.duration, genre:t.genre, source:t.source }));
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
