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

// ── ANDROID BACK BUTTON ────────────────────────────────
// Priority: close open overlay/modal → close player → go to
// Home tab if elsewhere → only exit app if already on Home
// with nothing open.
const AppPlugin = window.Capacitor?.Plugins?.App;
if(AppPlugin){
  AppPlugin.addListener('backButton', () => {
    // 1. Any open sheet/modal/menu takes priority
    const openOverlays = [
      { id: 'ctx-overlay',          close: () => closeContextMenu() },
      { id: 'drive-modal',          close: () => closeDriveModal() },
      { id: 'queue-sheet',          close: () => closeQueue() },
      { id: 'folder-picker-sheet',  close: () => document.getElementById('folder-picker-sheet')?.remove() },
    ];
    for(const o of openOverlays){
      const el = document.getElementById(o.id);
      if(el && el.classList.contains('open')){ o.close(); return; }
    }

    // 2. Full-screen Now Playing
    const player = document.getElementById('screen-player');
    if(player && player.classList.contains('open')){ closePlayer(); return; }

    // 3. Equalizer screen → back to Settings
    const eqScreen = document.getElementById('screen-eq');
    if(eqScreen && eqScreen.classList.contains('active')){ switchTab('settings'); return; }

    // 3b. Playlists screen → back to Library
    const plScreen = document.getElementById('screen-playlists');
    if(plScreen && plScreen.classList.contains('active')){ switchTab('library'); return; }

    // 4. Any non-home tab → back to Home
    const homeScreen = document.getElementById('screen-home');
    if(homeScreen && !homeScreen.classList.contains('active')){ switchTab('home'); return; }

    // 5. Already on Home with nothing open → exit app
    AppPlugin.exitApp();
  });

  // ── GOOGLE DRIVE OAUTH REDIRECT LISTENER ──────────────
  // Fires when Android routes the com.auramusic.app://oauth
  // redirect back into this running app instance.
  AppPlugin.addListener('appUrlOpen', (data) => {
    if(data?.url && typeof handleDriveOAuthCallback === 'function'){
      handleDriveOAuthCallback(data.url);
    }
  });
}

console.log('🎵 Aura Music loaded');
