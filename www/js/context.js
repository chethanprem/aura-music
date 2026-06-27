// ═══════════════════════════════════════════════════════
// CONTEXT MENU
// ═══════════════════════════════════════════════════════
function openContextMenu(idx){
  const tracks = state.tracks;
  const t = tracks[idx];
  if(!t) return;
  ctxTargetIndex = idx;
  currentTrackIndex = idx;
  document.getElementById('ctx-title').textContent = t.title;
  document.getElementById('ctx-artist').textContent = t.artist;
  document.getElementById('ctx-thumb').textContent = getTrackEmoji(t);
  document.getElementById('ctx-like-text').textContent = state.liked.has(t.id) ? 'Unlike' : 'Like';
  document.getElementById('ctx-overlay').classList.add('open');
}
function closeContextMenu(e){
  if(!e || e.target === document.getElementById('ctx-overlay'))
    document.getElementById('ctx-overlay').classList.remove('open');
}
function ctxPlay(){ playTrack(ctxTargetIndex); closeContextMenu(); }
function ctxAddToQueue(){
  const tracks = state.tracks;
  const t = tracks[ctxTargetIndex];
  if(t){ state.queue = [...(state.queue.length?state.queue:tracks)]; showSnack('Added to queue'); }
  closeContextMenu();
}
function ctxToggleLike(){
  const tracks = state.tracks;
  const t = tracks[ctxTargetIndex];
  if(!t) return;
  if(state.liked.has(t.id)) state.liked.delete(t.id); else state.liked.add(t.id);
  updateLikedCount(); saveState();
  showSnack(state.liked.has(t.id)?'Liked ❤️':'Removed from liked');
  closeContextMenu();
}
function ctxAddToPlaylist(){
  if(!state.playlists.length){ showSnack('Create a playlist first'); closeContextMenu(); return; }
  const names = state.playlists.map((p,i)=>`${i+1}. ${p.name}`).join('\n');
  const choice = prompt(`Add to playlist:\n${names}\n\nEnter number:`);
  const idx = parseInt(choice)-1;
  if(idx>=0 && idx<state.playlists.length){
    const tracks = state.tracks;
    state.playlists[idx].tracks.push(tracks[ctxTargetIndex]);
    saveState();
    showSnack(`Added to ${state.playlists[idx].name}`);
  }
  closeContextMenu();
}
function ctxShare(){ shareTrack(); closeContextMenu(); }
function ctxRemove(){
  if(state.tracks.length){
    state.tracks.splice(ctxTargetIndex,1);
    renderLibrary(); renderHome();
    showSnack('Track removed');
    saveState();
  }
  closeContextMenu();
}

