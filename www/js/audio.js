// ── AUDIO ENGINE ─────────────────────────────────────────────────
// Handles all playback: play/pause/seek/volume/EQ/media session
// No DOM manipulation here — only audio logic.
// ─────────────────────────────────────────────────────────────────

var _audio      = null;
var _audioCtx   = null;
var _gainNode   = null;
var _eqNodes    = [];
var _seekDrag   = false;
var _sleepTimer = null;

var EQ_FREQS   = [60, 230, 910, 4000, 6000, 10000, 14000];
var EQ_LABELS  = ['60Hz','230','910','4k','6k','10k','14k'];
var EQ_PRESETS = {
  'Default':   [0, 0, 0, 0, 0, 0, 0],
  'Pop':       [2, 4, 6, 2, 0, 1, 2],
  'Rock':      [5, 4, 3, 0,-1, 3, 5],
  'Hip Hop':   [7, 6, 2, 0,-1, 3, 4],
  'Jazz':      [3, 2, 1, 2, 3, 2, 1],
  'Classical': [4, 3, 2, 0, 0, 2, 3],
  'Bass Boost':[8, 6, 4, 0, 0, 0, 0],
};

function audioInit() {
  if (_audio) return;
  _audio = new Audio();
  _audio.volume = APP.volume;
  _audio.addEventListener('timeupdate', _onTimeUpdate);
  _audio.addEventListener('ended',      _onEnded);
  _audio.addEventListener('loadedmetadata', _onMeta);
  _audio.addEventListener('error', function() {
    showSnack('Cannot play this track');
    audioNext();
  });
}

function _setupCtx() {
  if (_audioCtx || !_audio) return;
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var src = _audioCtx.createMediaElementSource(_audio);
    _gainNode = _audioCtx.createGain();
    _gainNode.gain.value = APP.volume;
    _eqNodes = EQ_FREQS.map(function(freq, i) {
      var f = _audioCtx.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === EQ_FREQS.length-1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = APP.eqEnabled ? (APP.eqBands[i] || 0) : 0;
      return f;
    });
    var chain = src;
    _eqNodes.forEach(function(n) { chain.connect(n); chain = n; });
    chain.connect(_gainNode);
    _gainNode.connect(_audioCtx.destination);
  } catch(e) { console.warn('AudioContext failed:', e); }
}

function audioPlay(track) {
  if (!track || !track.url) return;
  audioInit();
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  _setupCtx();
  _audio.src = track.url;
  _audio.load();
  _audio.play().catch(function(e) {
    console.warn('play() error:', e);
    showSnack('Cannot play: ' + track.title);
  });
  APP.queue      = APP.tracks.slice();
  APP.queueIndex = APP.tracks.indexOf(track);
  _updateMediaSession(track);
  uiOnTrackChange(track);
}

function audioToggle() {
  if (!_audio) return;
  if (_audio.paused) {
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    _audio.play().catch(function(){});
  } else {
    _audio.pause();
  }
  uiOnPlayState();
}

function audioPrev() {
  if (_audio && _audio.currentTime > 3) { _audio.currentTime = 0; return; }
  var idx = APP.queueIndex - 1;
  if (idx < 0) idx = APP.queue.length - 1;
  _playByQueueIndex(idx);
}

function audioNext() {
  var idx;
  if (APP.shuffle) {
    idx = Math.floor(Math.random() * APP.queue.length);
  } else {
    idx = APP.queueIndex + 1;
    if (idx >= APP.queue.length) idx = 0;
  }
  _playByQueueIndex(idx);
}

function _playByQueueIndex(idx) {
  if (!APP.queue.length) return;
  APP.queueIndex = idx;
  var t = APP.queue[idx];
  if (!t) return;
  // Refresh Drive URL if token exists
  if (t.source === 'drive' && t.driveId && window._driveToken) {
    t.url = 'https://www.googleapis.com/drive/v3/files/' + t.driveId + '?alt=media&access_token=' + window._driveToken;
  }
  audioInit();
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  _audio.src = t.url;
  _audio.load();
  _audio.play().catch(function(){});
  _updateMediaSession(t);
  uiOnTrackChange(t);
}

function audioSeek(pct) {
  if (_audio && _audio.duration) {
    _audio.currentTime = (pct / 100) * _audio.duration;
  }
}

function audioVolume(val) {
  APP.volume = val / 100;
  if (_audio)    _audio.volume    = APP.volume;
  if (_gainNode) _gainNode.gain.value = APP.volume;
  savePrefs();
}

function audioIsPlaying() {
  return _audio && !_audio.paused;
}

function audioCurrentTime() {
  return _audio ? _audio.currentTime : 0;
}

function audioDuration() {
  return _audio ? (_audio.duration || 0) : 0;
}

function _onTimeUpdate() {
  if (_seekDrag) return;
  var pct = audioDuration() ? (audioCurrentTime() / audioDuration() * 100) : 0;
  uiOnTimeUpdate(pct, audioCurrentTime(), audioDuration());
}

function _onEnded() {
  if (APP.repeat === 2) { _audio.currentTime = 0; _audio.play(); return; }
  audioNext();
}

function _onMeta() {
  uiOnDuration(audioDuration());
}

// ── EQ ───────────────────────────────────────────────────────────
function eqSetBand(idx, val) {
  APP.eqBands[idx] = val;
  if (_eqNodes[idx]) _eqNodes[idx].gain.value = APP.eqEnabled ? val : 0;
  savePrefs();
}

function eqToggle(on) {
  APP.eqEnabled = on;
  _eqNodes.forEach(function(n, i) {
    n.gain.value = on ? (APP.eqBands[i] || 0) : 0;
  });
  savePrefs();
}

function eqApplyPreset(name) {
  var vals = EQ_PRESETS[name] || EQ_PRESETS['Default'];
  APP.eqBands = vals.slice();
  _eqNodes.forEach(function(n, i) {
    n.gain.value = APP.eqEnabled ? vals[i] : 0;
  });
  savePrefs();
}

// ── SLEEP TIMER ──────────────────────────────────────────────────
function setSleepTimer(minutes) {
  if (_sleepTimer) clearTimeout(_sleepTimer);
  APP.sleepMinutes = minutes;
  if (minutes > 0) {
    _sleepTimer = setTimeout(function() {
      if (_audio) _audio.pause();
      uiOnPlayState();
      showSnack('Sleep timer ended ✓');
      APP.sleepMinutes = 0;
    }, minutes * 60000);
  }
  savePrefs();
}

// ── MEDIA SESSION ─────────────────────────────────────────────────
function _updateMediaSession(t) {
  if (!navigator.mediaSession) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: t.album,
    });
    navigator.mediaSession.setActionHandler('play',          function(){ audioToggle(); });
    navigator.mediaSession.setActionHandler('pause',         function(){ audioToggle(); });
    navigator.mediaSession.setActionHandler('previoustrack', audioPrev);
    navigator.mediaSession.setActionHandler('nexttrack',     audioNext);
  } catch(e) {}
}
