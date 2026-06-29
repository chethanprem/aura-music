// ── UI LAYER ──────────────────────────────────────────────────────
// All DOM reads/writes live here.
// Called by app.js (event wiring) and audio.js (playback callbacks).
// ─────────────────────────────────────────────────────────────────

var _snackTimer = null;

function showSnack(msg) {
  var el = document.getElementById('snackbar');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_snackTimer);
  _snackTimer = setTimeout(function() { el.classList.remove('show'); }, 2800);
}

// ── TAB NAVIGATION ───────────────────────────────────────────────
function switchTab(tab) {
  var tabs = ['home','search','library','playlists','settings','equalizer'];
  tabs.forEach(function(t) {
    var s = document.getElementById('screen-' + t);
    if (s) s.classList.toggle('active', t === tab);
  });
  // Nav items (equalizer has no nav item)
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  // Re-render active screen
  if (tab === 'home')      renderHome();
  if (tab === 'library')   renderLibrary();
  if (tab === 'playlists') renderPlaylists();
  if (tab === 'settings')  renderSettings();
  if (tab === 'equalizer') renderEQ();
}

// ── PLAYER OPEN / CLOSE ──────────────────────────────────────────
function openPlayer() {
  document.getElementById('screen-player').classList.add('open');
}
function closePlayer() {
  document.getElementById('screen-player').classList.remove('open');
}

// ── AUDIO CALLBACKS (called by audio.js) ─────────────────────────
function uiOnTrackChange(t) {
  if (!t) return;
  // Mini player
  var mp = document.getElementById('mini-player');
  if (mp) mp.classList.remove('hidden');
  _setText('mini-title',  t.title);
  _setText('mini-artist', t.artist);
  _setThumb('mini-thumb', t.thumb);
  // Full player
  _setText('player-title',       t.title);
  _setText('player-artist-text', t.artist);
  _setArt('player-art', t.thumb);
  // Like button
  _refreshLikeBtn(t.id);
  // Recently played
  APP.recentlyPlayed = [t.id].concat(
    APP.recentlyPlayed.filter(function(id) { return id !== t.id; })
  ).slice(0, 30);
  savePrefs();
  // Highlight active track in lists
  document.querySelectorAll('.track-row').forEach(function(el) {
    el.classList.toggle('playing', el.dataset.trackId === t.id);
  });
  uiOnPlayState();
}

function uiOnPlayState() {
  var playing = audioIsPlaying();
  // Full player button
  var btn = document.getElementById('play-btn');
  if (btn) btn.innerHTML = playing ? _pauseIcon(28) : _playIcon(28);
  // Mini player button
  var mini = document.getElementById('mini-play');
  if (mini) mini.innerHTML = playing ? _pauseIcon(20) : _playIcon(20);
  // Artwork animation
  var art = document.getElementById('player-art');
  if (art) art.classList.toggle('playing', playing);
}

function uiOnTimeUpdate(pct, cur, dur) {
  var bar = document.getElementById('seek-bar');
  if (bar) { bar.value = pct; bar.style.setProperty('--pct', pct + '%'); }
  _setText('time-cur', _fmt(cur));
  _setText('time-tot', _fmt(dur));
  var mp = document.getElementById('mini-progress');
  if (mp) mp.style.width = pct + '%';
}

function uiOnDuration(dur) {
  _setText('time-tot', _fmt(dur));
}

// ── RENDER SCREENS ───────────────────────────────────────────────
function renderHome() {
  // Greeting
  var h = new Date().getHours();
  _setText('home-greeting',
    h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

  // Top cards row
  var row = document.getElementById('home-cards-row');
  if (!row) return;

  if (!APP.tracks.length) {
    row.innerHTML =
      '<div class="home-card" id="hc-scan">' +
        '<div class="cover" style="background:#4c1d95">🎵</div>' +
        '<div class="card-name">Scan Device</div>' +
        '<div class="card-sub">Add your music</div>' +
      '</div>' +
      '<div class="home-card" id="hc-drive">' +
        '<div class="cover" style="background:#1e3a5f">☁️</div>' +
        '<div class="card-name">Google Drive</div>' +
        '<div class="card-sub">Sync from cloud</div>' +
      '</div>';

    var scanCard  = document.getElementById('hc-scan');
    var driveCard = document.getElementById('hc-drive');
    if (scanCard)  scanCard.addEventListener('click',  function() { switchTab('library'); });
    if (driveCard) driveCard.addEventListener('click', function() { switchTab('settings'); });
  } else {
    var liked   = APP.tracks.filter(function(t) { return APP.liked[t.id]; });
    var recent  = _resolveIds(APP.recentlyPlayed.slice(0, 4));
    var cards   = [];
    if (liked.length)  cards.push({ name:'Liked Songs',    sub: liked.length + ' songs',   icon:'❤️',  tracks: liked });
    if (recent.length) cards.push({ name:'Recently Played',sub: recent.length + ' songs',  icon:'🕐',  tracks: recent });
    cards.push({ name:'Shuffle All', sub: APP.tracks.length + ' songs', icon:'🔀', tracks: null });

    var bgs = ['#4c1d95','#1e3a5f','#064e3b','#7f1d1d','#1c1917'];
    row.innerHTML = cards.slice(0,5).map(function(c, i) {
      return '<div class="home-card" data-card-idx="' + i + '">' +
        '<div class="cover" style="background:' + bgs[i % bgs.length] + '">' + c.icon + '</div>' +
        '<div class="card-name">' + _esc(c.name) + '</div>' +
        '<div class="card-sub">'  + _esc(c.sub)  + '</div>' +
      '</div>';
    }).join('');

    row.querySelectorAll('.home-card').forEach(function(el) {
      el.addEventListener('click', function() {
        var idx = parseInt(el.dataset.cardIdx);
        var c   = cards[idx];
        if (!c) return;
        var list = c.tracks || APP.tracks;
        if (c.name === 'Shuffle All') { APP.shuffle = true; }
        if (list.length) audioPlay(list[0]);
        APP.queue      = list.slice();
        APP.queueIndex = 0;
      });
    });
  }

  // Recent list
  var listEl = document.getElementById('home-recent-list');
  if (!listEl) return;
  var recent = _resolveIds(APP.recentlyPlayed.slice(0, 8));
  var show   = recent.length ? recent : APP.tracks.slice(0, 8);
  if (!show.length) {
    listEl.innerHTML = '<div class="empty-state" style="padding:24px">' +
      '<p>Scan your device or link Google Drive<br>to see music here.</p></div>';
  } else {
    listEl.innerHTML = show.map(function(t) { return _trackRowHTML(t); }).join('');
    _bindTrackRows(listEl, show);
  }
}

function renderLibrary() {
  // Counts
  var liked = APP.tracks.filter(function(t) { return APP.liked[t.id]; });
  _setText('lc-liked-count', liked.length + ' songs');
  _setText('lc-pl-count',    APP.playlists.length + ' playlists');
  _setText('all-songs-count','(' + APP.tracks.length + ')');
  _updateDriveSettingsUI();

  var listEl = document.getElementById('library-list');
  if (!listEl) return;

  if (!APP.tracks.length) {
    listEl.innerHTML =
      '<div class="empty-state">' +
        '<div class="es-icon">🎵</div>' +
        '<p>Tap <strong>Scan Device</strong> above<br>to load music from your phone</p>' +
      '</div>';
    return;
  }

  listEl.innerHTML = APP.tracks.map(function(t) { return _trackRowHTML(t); }).join('');
  _bindTrackRows(listEl, APP.tracks);
}

function renderPlaylists() {
  var el = document.getElementById('playlists-list');
  if (!el) return;
  if (!APP.playlists.length) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<div class="es-icon">📋</div>' +
        '<p>No playlists yet.<br>Tap + to create one.</p>' +
      '</div>';
    return;
  }
  el.innerHTML = APP.playlists.map(function(pl, i) {
    return '<div class="pl-row" data-pl-idx="' + i + '">' +
      '<div class="pl-cover">🎵</div>' +
      '<div class="pl-info">' +
        '<div class="pl-name">' + _esc(pl.name) + '</div>' +
        '<div class="pl-sub">'  + pl.trackIds.length + ' songs</div>' +
      '</div>' +
    '</div>';
  }).join('');
  el.querySelectorAll('.pl-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var idx    = parseInt(row.dataset.plIdx);
      var pl     = APP.playlists[idx];
      var tracks = _resolveIds(pl.trackIds);
      if (tracks.length) { audioPlay(tracks[0]); APP.queue = tracks; APP.queueIndex = 0; }
      else showSnack('Playlist is empty');
    });
  });
}

function renderSettings() {
  _updateDriveSettingsUI();
  var cfLabels = ['Off','1s','2s','3s','5s'];
  _setText('crossfade-val', cfLabels[APP.crossfade] || 'Off');
  var slLabels = ['Off','15 min','30 min','45 min','60 min','90 min'];
  var slOpts   = [0, 15, 30, 45, 60, 90];
  _setText('sleep-val', slLabels[slOpts.indexOf(APP.sleepMinutes)] || 'Off');
}

function renderEQ() {
  // Preset chips
  var presetRow = document.getElementById('preset-row');
  if (presetRow && !presetRow.dataset.built) {
    presetRow.dataset.built = '1';
    Object.keys(EQ_PRESETS).forEach(function(name) {
      var chip = document.createElement('div');
      chip.className   = 'preset-chip' + (name === 'Default' ? ' active' : '');
      chip.textContent = name;
      chip.addEventListener('click', function() {
        presetRow.querySelectorAll('.preset-chip').forEach(function(c) { c.classList.remove('active'); });
        chip.classList.add('active');
        eqApplyPreset(name);
        _rebuildEQBands();
      });
      presetRow.appendChild(chip);
    });
  }
  _rebuildEQBands();
  var cb = document.getElementById('eq-enable');
  if (cb) cb.checked = APP.eqEnabled;
}

function _rebuildEQBands() {
  var container = document.getElementById('eq-bands');
  if (!container) return;
  container.innerHTML = APP.eqBands.map(function(v, i) {
    var pct = ((v + 12) / 24 * 100);
    return '<div class="eq-band">' +
      '<span class="eq-band-val" id="eq-val-' + i + '">' + (v > 0 ? '+' : '') + v + 'dB</span>' +
      '<input type="range" class="eq-slider" ' +
        'min="-12" max="12" value="' + v + '" ' +
        'style="--pct:' + pct + '%" ' +
        'data-band="' + i + '"' +
        (APP.eqEnabled ? '' : ' disabled') + '/>' +
      '<span class="eq-band-label">' + EQ_LABELS[i] + '</span>' +
    '</div>';
  }).join('');
  container.querySelectorAll('.eq-slider').forEach(function(slider) {
    slider.addEventListener('input', function() {
      var idx = parseInt(slider.dataset.band);
      var val = parseInt(slider.value);
      var pct = ((val + 12) / 24 * 100);
      slider.style.setProperty('--pct', pct + '%');
      var lbl = document.getElementById('eq-val-' + idx);
      if (lbl) lbl.textContent = (val > 0 ? '+' : '') + val + 'dB';
      eqSetBand(idx, val);
    });
  });
}

// ── TRACK ROW HELPERS ────────────────────────────────────────────
function _trackRowHTML(t) {
  return '<div class="track-row" data-track-id="' + _esc(t.id) + '">' +
    '<div class="t-thumb">' + (t.thumb ? '<img src="' + _esc(t.thumb) + '" alt=""/>' : _trackEmoji(t)) + '</div>' +
    '<div class="t-info">' +
      '<div class="track-title">'  + _esc(t.title)  + '</div>' +
      '<div class="track-artist">' + _esc(t.artist) + '</div>' +
    '</div>' +
    (t.duration ? '<span class="track-dur">' + _fmt(t.duration) + '</span>' : '') +
  '</div>';
}

function _bindTrackRows(container, tracks) {
  var byId = {};
  tracks.forEach(function(t) { byId[t.id] = t; });
  container.querySelectorAll('.track-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var t = byId[row.dataset.trackId];
      if (t) { audioPlay(t); openPlayer(); }
    });
  });
}

// ── LIKE BUTTON ──────────────────────────────────────────────────
function _refreshLikeBtn(trackId) {
  var btn = document.getElementById('like-btn');
  if (!btn) return;
  var liked = APP.liked[trackId];
  btn.classList.toggle('liked', !!liked);
  btn.innerHTML = liked
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:var(--danger)"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
}

function toggleLike() {
  var t = APP.queue[APP.queueIndex];
  if (!t) return;
  if (APP.liked[t.id]) delete APP.liked[t.id];
  else APP.liked[t.id] = true;
  _refreshLikeBtn(t.id);
  savePrefs();
  var count = APP.tracks.filter(function(x) { return APP.liked[x.id]; }).length;
  _setText('lc-liked-count', count + ' songs');
}

// ── PRIVATE UTILS ─────────────────────────────────────────────────
function _setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _setThumb(id, src) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = src ? '<img src="' + _esc(src) + '" alt=""/>' : '🎵';
}

function _setArt(id, src) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = src ? '<img src="' + _esc(src) + '" alt=""/>' : '🎵';
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmt(s) {
  s = Math.floor(s || 0);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function _resolveIds(ids) {
  var byId = {};
  APP.tracks.forEach(function(t) { byId[t.id] = t; });
  return (ids || []).map(function(id) { return byId[id]; }).filter(Boolean);
}

function _trackEmoji(t) {
  var map = { Chill:'🌙', Electronic:'🎹', 'Hip Hop':'🎤', Pop:'🎵', Rock:'🎸', Jazz:'🎷', Classical:'🎻', Workout:'💪' };
  return map[t.genre] || '🎵';
}

function _playIcon(sz) {
  return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
}
function _pauseIcon(sz) {
  return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
}
