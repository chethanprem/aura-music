// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
// Load persisted track list from previous session
loadTracksFromStorage();

// Load saved preferences
loadState();

// Resolve recently played from saved IDs now that tracks are loaded
try{ resolveRecentlyPlayed(); }catch(e){}

// Always ensure these arrays exist (loadState may not set them)
if(!state.recentlyPlayed) state.recentlyPlayed = [];
if(!state.tracks) state.tracks = [];
if(!state.queue) state.queue = [];
if(!state.playlists) state.playlists = [];

// Render UI first — app is usable immediately
renderAll();
renderSearchBrowse();
updateDriveUI();

// Auto-scan in background AFTER UI is painted (don't block tabs)
if(IS_NATIVE && !state.tracks.length){
  setTimeout(scanLocalMusic, 1500);
}

// Set initial volume bar
const vb = document.getElementById('vol-bar');
if(vb){ vb.value = state.volume*100; vb.style.setProperty('--pct', (state.volume*100)+'%'); }

// Greeting
const h = new Date().getHours();
document.getElementById('home-greeting').textContent = h<12?'Good morning':h<18?'Good afternoon':'Good evening';

console.log('🎵 Aura Music loaded');
</script>
