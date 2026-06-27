// ═══════════════════════════════════════════════════════
// PLAYLISTS
// ═══════════════════════════════════════════════════════
function createPlaylist(){
  const name = prompt('Playlist name:');
  if(!name?.trim()) return;
  state.playlists.push({name:name.trim(), tracks:[], thumb:null, id:Date.now()});
  renderPlaylists();
  updatePlaylistCount();
  saveState();
  showSnack(`Playlist "${name}" created`);
}

function openPlaylist(i){
  const pl = state.playlists[i];
  if(!pl) return;
  if(pl.tracks.length){
    state.queue = pl.tracks;
    playTrack(0, pl.tracks);
  } else {
    showSnack('Playlist is empty. Add songs from the library.');
  }
}

function openPlaylistMenu(i){
  const pl = state.playlists[i];
  if(!pl) return;
  if(confirm(`Delete playlist "${pl.name}"?`)){
    state.playlists.splice(i,1);
    renderPlaylists();
    updatePlaylistCount();
    saveState();
  }
}

function updatePlaylistCount(){
  document.getElementById('playlists-count').textContent = state.playlists.length + ' playlists';
}

