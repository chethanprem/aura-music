// ═══════════════════════════════════════════════════════
// INIT — runs after all scripts are loaded
// ═══════════════════════════════════════════════════════
loadTracksFromStorage();
loadState();

// Restore drive token silently
loadDriveToken();

try{ resolveRecentlyPlayed(); }catch(e){}

if(!state.recentlyPlayed) state.recentlyPlayed = [];
if(!state.tracks)   state.tracks   = [];
if(!state.queue)    state.queue    = [];
if(!state.playlists) state.playlists = [];

renderAll();
renderSearchBrowse();
updateDriveUI();

// Set initial volume bar
const vb = document.getElementById('vol-bar');
if(vb){ vb.value = state.volume * 100; vb.style.setProperty('--pct', (state.volume * 100) + '%'); }

// Greeting
const h = new Date().getHours();
const greet = document.getElementById('home-greeting');
if(greet) greet.textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

console.log('🎵 Aura Music loaded');
