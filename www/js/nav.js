// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
const TABS = ['home','search','library','playlists','settings'];

function switchTab(tab){
  // Equalizer has a screen but no nav item — handle separately
  const navTabs = ['home','search','library','playlists','settings'];
  const allScreens = [...navTabs, 'equalizer'];

  allScreens.forEach(t=>{
    const s = document.getElementById('screen-'+t);
    if(s) s.classList.toggle('active', t===tab);
  });
  navTabs.forEach(t=>{
    const n = document.getElementById('nav-'+t);
    if(n) n.classList.toggle('active', t===tab);
  });

  try{
    if(tab === 'home')     renderHome();
    if(tab === 'library')  renderLibrary();
    if(tab === 'playlists') renderPlaylists();
    if(tab === 'settings') renderSettings();
    if(tab === 'equalizer') renderEQ();
    if(tab === 'search')   renderSearchBrowse();
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

