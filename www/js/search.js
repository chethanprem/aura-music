// ═══════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════
function handleSearch(q){
  const browse = document.getElementById('browse-view');
  const results = document.getElementById('search-results');
  if(!q.trim()){
    browse.style.display='';
    results.innerHTML='';
    renderSearchBrowse();
    return;
  }
  browse.style.display='none';
  const all = [...state.tracks];
  const lq = q.toLowerCase();
  const found = all.filter(t=>
    t.title.toLowerCase().includes(lq)||
    t.artist.toLowerCase().includes(lq)||
    t.album.toLowerCase().includes(lq)
  );
  if(!found.length){
    results.innerHTML = `<div class="empty-state" style="padding:32px;"><span class="es-icon">🔍</span><p>No results for "<strong>${q}</strong>"</p></div>`;
    return;
  }
  results.innerHTML = `<div class="section-title" style="margin-top:16px;">Results (${found.length})</div>`
    + found.map((t,i)=>trackRowHTML(t,i,'search')).join('');
}

function filterByGenre(genre){
  document.getElementById('search-input').value = genre;
  handleSearch(genre);
  addRecentSearch(genre);
}

function renderSearchBrowse(){
  const wrap = document.getElementById('recent-searches-wrap');
  wrap.innerHTML = state.recentSearches.slice(-6).reverse().map((s,i)=>`
    <div class="recent-chip">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <span onclick="document.getElementById('search-input').value='${s}';handleSearch('${s}')">${s}</span>
      <button onclick="removeRecentSearch('${s}')">✕</button>
    </div>`).join('');
}

function addRecentSearch(q){
  if(!q) return;
  state.recentSearches = state.recentSearches.filter(s=>s!==q);
  state.recentSearches.push(q);
  if(state.recentSearches.length > 12) state.recentSearches.shift();
  saveState();
}

function removeRecentSearch(q){
  state.recentSearches = state.recentSearches.filter(s=>s!==q);
  renderSearchBrowse();
  saveState();
}

