// ═══════════════════════════════════════════════════════
// LIBRARY SECTIONS
// ═══════════════════════════════════════════════════════
function showLibrarySection(type){
  let tracks = state.tracks;
  if(type === 'liked') tracks = tracks.filter(t=>state.liked.has(t.id));
  if(!tracks.length){
    showSnack('No tracks in this section yet');
    return;
  }
  // Just filter-in-place for now (full playlist nav would be Phase 2)
  const list = document.getElementById('library-tracks-list');
  list.innerHTML = tracks.map((t,i)=>trackRowHTML(t,i,'lib')).join('');
  document.getElementById('library-empty').style.display='none';
}

function sortLibrary(){
  state.tracks.sort((a,b)=>a.title.localeCompare(b.title));
  renderLibrary();
  showSnack('Sorted A–Z');
}

