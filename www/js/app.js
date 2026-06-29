// ── APP BOOTSTRAP ────────────────────────────────────────────────
// Wires all click/input events and runs init.
// This is the ONLY file that touches the DOM for event binding.
// Runs after all other scripts are loaded.
// ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {

  // ── 1. Load saved data ────────────────────────────────────────
  loadTracks();
  loadPrefs();

  // ── 2. Render initial UI ──────────────────────────────────────
  renderHome();
  renderLibrary();
  renderPlaylists();
  renderSettings();
  renderEQ();

  // ── 3. Set initial control values ────────────────────────────
  var volBar = document.getElementById('vol-bar');
  if (volBar) {
    volBar.value = APP.volume * 100;
    volBar.style.setProperty('--pct', (APP.volume * 100) + '%');
  }

  // ── 4. BOTTOM NAV ─────────────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function() {
      switchTab(item.dataset.tab);
    });
  });

  // ── 5. MINI PLAYER ────────────────────────────────────────────
  document.getElementById('mini-player').addEventListener('click', function(e) {
    // Only open player if not clicking a control button
    if (!e.target.closest('.mini-btn')) openPlayer();
  });
  document.getElementById('mini-prev').addEventListener('click', function(e) {
    e.stopPropagation(); audioPrev();
  });
  document.getElementById('mini-play').addEventListener('click', function(e) {
    e.stopPropagation(); audioToggle(); uiOnPlayState();
  });
  document.getElementById('mini-next').addEventListener('click', function(e) {
    e.stopPropagation(); audioNext();
  });

  // ── 6. FULL PLAYER ────────────────────────────────────────────
  document.getElementById('player-close-btn').addEventListener('click', closePlayer);

  document.getElementById('prev-btn').addEventListener('click', audioPrev);
  document.getElementById('next-btn').addEventListener('click', audioNext);
  document.getElementById('play-btn').addEventListener('click', function() {
    audioToggle(); uiOnPlayState();
  });

  document.getElementById('shuffle-btn').addEventListener('click', function() {
    APP.shuffle = !APP.shuffle;
    this.classList.toggle('on', APP.shuffle);
    showSnack(APP.shuffle ? 'Shuffle on' : 'Shuffle off');
    savePrefs();
  });

  document.getElementById('repeat-btn').addEventListener('click', function() {
    APP.repeat = (APP.repeat + 1) % 3;
    this.classList.toggle('on', APP.repeat > 0);
    showSnack(['Repeat off', 'Repeat all', 'Repeat one'][APP.repeat]);
    savePrefs();
  });

  document.getElementById('like-btn').addEventListener('click', toggleLike);

  // Seek bar
  var seekBar  = document.getElementById('seek-bar');
  var seeking  = false;
  seekBar.addEventListener('mousedown',  function() { seeking = true; });
  seekBar.addEventListener('touchstart', function() { seeking = true; }, { passive:true });
  seekBar.addEventListener('input', function() {
    var pct = parseInt(this.value);
    this.style.setProperty('--pct', pct + '%');
  });
  seekBar.addEventListener('change', function() {
    seeking = false;
    audioSeek(parseInt(this.value));
  });

  // Volume bar
  var volBarEl = document.getElementById('vol-bar');
  volBarEl.addEventListener('input', function() {
    this.style.setProperty('--pct', this.value + '%');
    audioVolume(parseInt(this.value));
  });

  // ── 7. LIBRARY SCREEN ─────────────────────────────────────────
  document.getElementById('lc-scan').addEventListener('click', function() {
    document.getElementById('lc-scan-status').textContent = 'Scanning…';
    scanLocalMusic();
  });
  document.getElementById('lc-liked').addEventListener('click', function() {
    var liked = APP.tracks.filter(function(t) { return APP.liked[t.id]; });
    if (!liked.length) { showSnack('No liked songs yet'); return; }
    audioPlay(liked[0]);
    APP.queue = liked;
    APP.queueIndex = 0;
    openPlayer();
  });
  document.getElementById('lc-playlists').addEventListener('click', function() {
    switchTab('playlists');
  });
  document.getElementById('lc-drive').addEventListener('click', function() {
    switchTab('settings');
  });
  document.getElementById('sort-btn').addEventListener('click', function() {
    APP.tracks.sort(function(a, b) { return a.title.localeCompare(b.title); });
    renderLibrary();
    showSnack('Sorted A–Z');
  });

  // ── 8. PLAYLISTS SCREEN ───────────────────────────────────────
  document.getElementById('create-pl-btn').addEventListener('click', function() {
    var name = prompt('Playlist name:');
    if (!name || !name.trim()) return;
    APP.playlists.push({ name: name.trim(), trackIds: [] });
    savePrefs();
    renderPlaylists();
    showSnack('Playlist "' + name.trim() + '" created');
  });

  // ── 9. SETTINGS SCREEN ────────────────────────────────────────
  document.getElementById('drive-connect-row').addEventListener('click', driveToggleConnect);
  document.getElementById('drive-sync-row').addEventListener('click',    driveSyncNow);

  document.getElementById('eq-row').addEventListener('click', function() {
    switchTab('equalizer');
  });

  document.getElementById('crossfade-row').addEventListener('click', function() {
    var opts   = [0,1,2,3,5];
    var labels = ['Off','1s','2s','3s','5s'];
    APP.crossfade = (APP.crossfade + 1) % opts.length;
    document.getElementById('crossfade-val').textContent = labels[APP.crossfade];
    savePrefs();
  });

  document.getElementById('sleep-row').addEventListener('click', function() {
    var opts   = [0,15,30,45,60,90];
    var labels = ['Off','15 min','30 min','45 min','60 min','90 min'];
    var cur    = opts.indexOf(APP.sleepMinutes);
    var next   = (cur + 1) % opts.length;
    setSleepTimer(opts[next]);
    document.getElementById('sleep-val').textContent = labels[next];
    showSnack('Sleep timer: ' + labels[next]);
  });

  document.getElementById('clear-cache-row').addEventListener('click', function() {
    if (!confirm('Remove all scanned tracks from library?')) return;
    APP.tracks = [];
    APP.queue  = [];
    saveTracks();
    renderLibrary();
    renderHome();
    showSnack('Library cleared');
  });

  // ── 10. EQUALIZER SCREEN ──────────────────────────────────────
  document.getElementById('eq-back-btn').addEventListener('click', function() {
    switchTab('settings');
  });

  document.getElementById('eq-enable').addEventListener('change', function() {
    eqToggle(this.checked);
    renderEQ();
  });

  document.getElementById('eq-reset-btn').addEventListener('click', function() {
    APP.eqBands = [0,0,0,0,0,0,0];
    eqApplyPreset('Default');
    renderEQ();
    var chips = document.querySelectorAll('.preset-chip');
    chips.forEach(function(c) { c.classList.remove('active'); });
    if (chips[0]) chips[0].classList.add('active');
    showSnack('EQ reset');
  });

  // ── 11. SEARCH ────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', function() {
    var q       = this.value.trim().toLowerCase();
    var results = document.getElementById('search-results');
    var browse  = document.getElementById('search-browse');
    if (!q) { results.innerHTML = ''; browse.style.display = ''; return; }
    browse.style.display = 'none';
    var found = APP.tracks.filter(function(t) {
      return t.title.toLowerCase().indexOf(q) !== -1 ||
             t.artist.toLowerCase().indexOf(q) !== -1 ||
             t.album.toLowerCase().indexOf(q) !== -1;
    });
    if (!found.length) {
      results.innerHTML = '<div class="empty-state" style="padding:32px"><p>No results for "' + _esc(q) + '"</p></div>';
      return;
    }
    results.innerHTML = found.map(function(t) { return _trackRowHTML(t); }).join('');
    _bindTrackRows(results, found);
  });

  document.querySelectorAll('.browse-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.getElementById('search-input').value = chip.dataset.genre;
      document.getElementById('search-input').dispatchEvent(new Event('input'));
    });
  });

  // ── 12. AUTO-SCAN on first launch (native only) ───────────────
  if (IS_NATIVE && !APP.tracks.length) {
    setTimeout(function() {
      scanLocalMusic();
    }, 2000); // wait 2s so UI is fully painted first
  }

  // Restore Drive UI state
  _updateDriveSettingsUI();

  console.log('Aura Music ready \uD83C\uDFB5');
});
