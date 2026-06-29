// ═══════════════════════════════════════════════════════
// LIBRARY SECTION FILTERING + SORT
// ═══════════════════════════════════════════════════════
let _libSection = 'all';
let _libSortAZ  = true;

function showLibrarySection(section){
  _libSection = section;
  document.querySelectorAll('#library-pills .pill').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase() === section ||
      (section==='all' && b.textContent==='All') ||
      (section==='liked' && b.textContent==='Liked') ||
      (section==='local' && b.textContent==='Device') ||
      (section==='drive' && b.textContent==='Drive'))
  );
  renderFilteredLibrary();
}

function sortLibrary(){
  _libSortAZ = !_libSortAZ;
  const btn = document.getElementById('sort-btn');
  if(btn) btn.textContent = _libSortAZ ? 'A–Z' : 'Z–A';
  renderFilteredLibrary();
}

function renderFilteredLibrary(){
  let tracks = [...state.tracks];
  if(_libSection === 'liked')  tracks = tracks.filter(t => state.liked.has(t.id));
  if(_libSection === 'local')  tracks = tracks.filter(t => t.source === 'local');
  if(_libSection === 'drive')  tracks = tracks.filter(t => t.source === 'drive');
  if(_libSortAZ) tracks.sort((a,b) => a.title.localeCompare(b.title));
  else           tracks.sort((a,b) => b.title.localeCompare(a.title));

  const empty = document.getElementById('library-empty');
  const list  = document.getElementById('library-tracks-list');
  if(empty) empty.style.display = tracks.length ? 'none' : 'flex';
  if(list)  list.innerHTML = tracks.map((t,i) => trackRowHTML(t, state.tracks.indexOf(t), 'lib')).join('');
}
