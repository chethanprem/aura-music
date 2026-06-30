// ═══════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════
const GENRES = ['Pop','Rock','Hip Hop','R&B','Electronic','Jazz','Classical','Chill','Workout','Podcasts'];

function renderSearchBrowse(){
  const chips = document.getElementById('genre-chips');
  if(chips) chips.innerHTML = GENRES.map(g=>`
    <button class="pill" onclick="handleSearch('${g}')" style="padding:8px 16px;">${g}</button>`).join('');
}

function handleSearch(q){
  q = (q||'').trim().toLowerCase();
  const browse  = document.getElementById('browse-view');
  const results = document.getElementById('search-results');
  const label   = document.getElementById('results-label');
  const list    = document.getElementById('results-list');

  if(!q){
    browse.style.display  = '';
    results.style.display = 'none';
    return;
  }
  browse.style.display  = 'none';
  results.style.display = '';

  const found = state.tracks.filter(t =>
    t.title.toLowerCase().includes(q)  ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q)  ||
    (t.genre||'').toLowerCase().includes(q)
  );

  if(label) label.textContent = found.length ? `${found.length} result${found.length>1?'s':''}` : 'No results';
  if(list)  list.innerHTML = found.map(t => trackRowHTML(t, state.tracks.indexOf(t), 'search')).join('');

  // Save recent search
  if(q.length > 1 && !state.recentSearches.includes(q)){
    state.recentSearches = [q, ...state.recentSearches].slice(0,8);
    saveState();
  }
}
