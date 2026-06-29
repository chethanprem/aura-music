// ── STATE ────────────────────────────────────────────────────────
// Single source of truth for the whole app.
// Nothing async here — just plain data + localStorage persistence.
// ─────────────────────────────────────────────────────────────────

var APP = {
  tracks:        [],   // all tracks in library
  queue:         [],   // current playback queue
  queueIndex:    0,    // index in queue
  liked:         {},   // {trackId: true}
  playlists:     [],   // [{name, trackIds:[]}]
  recentlyPlayed:[],   // track ids, newest first
  driveConnected:false,
  driveEmail:    '',
  volume:        0.8,
  shuffle:       false,
  repeat:        0,    // 0=off 1=all 2=one
  crossfade:     0,    // index into [Off,1s,2s,3s,5s]
  sleepMinutes:  0,
  eqEnabled:     true,
  eqBands:       [0,0,0,0,0,0,0],
};

var STORE_PREFS  = 'aura_prefs_v2';
var STORE_TRACKS = 'aura_tracks_v2';

function savePrefs() {
  try {
    localStorage.setItem(STORE_PREFS, JSON.stringify({
      liked:          APP.liked,
      playlists:      APP.playlists,
      recentlyPlayed: APP.recentlyPlayed,
      driveConnected: APP.driveConnected,
      driveEmail:     APP.driveEmail,
      volume:         APP.volume,
      shuffle:        APP.shuffle,
      repeat:         APP.repeat,
      crossfade:      APP.crossfade,
      sleepMinutes:   APP.sleepMinutes,
      eqEnabled:      APP.eqEnabled,
      eqBands:        APP.eqBands,
    }));
  } catch(e) {}
}

function loadPrefs() {
  try {
    var s = JSON.parse(localStorage.getItem(STORE_PREFS) || '{}');
    if (s.liked)          APP.liked          = s.liked;
    if (s.playlists)      APP.playlists      = s.playlists;
    if (s.recentlyPlayed) APP.recentlyPlayed = s.recentlyPlayed;
    if (s.driveConnected) APP.driveConnected = s.driveConnected;
    if (s.driveEmail)     APP.driveEmail     = s.driveEmail;
    if (s.volume != null) APP.volume         = s.volume;
    if (s.shuffle != null)APP.shuffle        = s.shuffle;
    if (s.repeat  != null)APP.repeat         = s.repeat;
    if (s.crossfade!=null)APP.crossfade      = s.crossfade;
    if (s.sleepMinutes!=null) APP.sleepMinutes = s.sleepMinutes;
    if (s.eqEnabled!=null)APP.eqEnabled      = s.eqEnabled;
    if (s.eqBands)        APP.eqBands        = s.eqBands;
  } catch(e) {}
}

function saveTracks() {
  try {
    localStorage.setItem(STORE_TRACKS, JSON.stringify(
      APP.tracks.map(function(t) {
        return {
          id:t.id, title:t.title, artist:t.artist,
          album:t.album, url:t.url, thumb:t.thumb,
          duration:t.duration, genre:t.genre, source:t.source,
          driveId:t.driveId || null
        };
      })
    ));
  } catch(e) {}
}

function loadTracks() {
  try {
    var raw = localStorage.getItem(STORE_TRACKS);
    if (raw) APP.tracks = JSON.parse(raw);
  } catch(e) {}
}
