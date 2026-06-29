// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
const TABS = ['home','search','library','playlists','settings'];

function switchTab(tab){
  const navTabs = ['home','search','library','playlists','settings'];
  const allScreens = [...navTabs, 'eq'];

  allScreens.forEach(t=>{
    const s = document.getElementById('screen-'+t);
    if(s) s.classList.toggle('active', t===tab);
  });
  navTabs.forEach(t=>{
    const n = document.querySelector(`[data-tab="${t}"]`);
    if(n) n.classList.toggle('active', t===tab);
  });

  try{
    if(tab === 'home')      renderHome();
    if(tab === 'library')   renderLibrary();
    if(tab === 'playlists') renderPlaylists();
    if(tab === 'settings')  renderSettings();
    if(tab === 'eq')        renderEQ();
    if(tab === 'search')    renderSearchBrowse();
  }catch(e){ console.error('switchTab render error:', e); }
}

function openPlayer(){
  document.getElementById('screen-player').classList.add('open');
  updatePlayerUI(currentTrack());
}
function closePlayer(){
  document.getElementById('screen-player').classList.remove('open');
}
function openQueue(){
  renderQueue();
  document.getElementById('queue-sheet').classList.add('open');
}
function closeQueue(){
  document.getElementById('queue-sheet').classList.remove('open');
}
