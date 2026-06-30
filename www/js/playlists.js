// ═══════════════════════════════════════════════════════
// PLAYLISTS
// ═══════════════════════════════════════════════════════
function createPlaylist(){
  const name = prompt('Playlist name:');
  if(!name?.trim()) return;
  state.playlists.push({ name: name.trim(), tracks: [], thumb: null });
  saveState();
  renderPlaylists();
  showSnack('Playlist created');
}

function openPlaylist(i){
  const pl = state.playlists[i];
  if(!pl) return;
  if(!pl.tracks.length){ showSnack('Playlist is empty'); return; }
  playTrack(0, pl.tracks);
  showSnack('Playing "' + pl.name + '"');
}

function openPlaylistMenu(i){
  const pl = state.playlists[i];
  if(!pl) return;
  const action = prompt(`"${pl.name}"\n\n1. Rename\n2. Delete\n\nEnter 1 or 2:`);
  if(action === '1'){
    const n = prompt('New name:', pl.name);
    if(n?.trim()){ pl.name = n.trim(); saveState(); renderPlaylists(); }
  } else if(action === '2'){
    if(confirm('Delete "' + pl.name + '"?')){
      state.playlists.splice(i,1);
      saveState();
      renderPlaylists();
      showSnack('Playlist deleted');
    }
  }
}
