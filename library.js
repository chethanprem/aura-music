// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
const state = {
  tracks: [],         // all loaded tracks
  queue: [],          // playback queue
  currentIndex: 0,
  isPlaying: false,
  shuffle: false,
  repeat: 0,          // 0=off, 1=all, 2=one
  volume: 0.8,
  liked: new Set(),
  playlists: [],
  recentSearches: [],
  driveConnected: false,
  driveEmail: '',
  crossfade: 0,
  sleepTimer: null,
  sleepMinutes: 0,
  eqEnabled: true,
  eqBands: [0,0,0,0,0,0,0],  // 7 bands
};

let audio = null;
let audioCtx = null;
let analyser = null;
let gainNode = null;
let eqNodes = [];
let seekDragging = false;
let ctxTargetIndex = -1;

// EQ Presets
const EQ_PRESETS = {
  'Default':    [0,0,0,0,0,0,0],
  'Pop':        [2,4,6,2,0,1,2],
  'Rock':       [5,4,3,0,-1,3,5],
  'Hip Hop':    [7,6,2,0,-1,3,4],
  'Jazz':       [3,2,1,2,3,2,1],
  'Classical':  [4,3,2,0,0,2,3],
  'Bass Boost': [8,6,4,0,0,0,0],
};

const EQ_FREQ_LABELS = ['60Hz','230Hz','910Hz','4kHz','14kHz','6kHz','14kHz'];
const EQ_FREQS = [60,230,910,4000,14000,6000,14000];

// Persist state keys
const STORE_KEY = 'aura_music_v1';

function saveState(){
  const save = {
    liked: [...(state.liked||new Set())],
    playlists: state.playlists||[],
    recentSearches: state.recentSearches||[],
    recentlyPlayed: (state.recentlyPlayed||[]).map(t=>t.id),
    driveConnected: state.driveConnected,
    driveEmail: state.driveEmail||'',
    volume: state.volume,
    shuffle: state.shuffle,
    repeat: state.repeat,
    crossfade: state.crossfade,
    eqEnabled: state.eqEnabled,
    eqBands: state.eqBands,
  };
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(save)); }catch(e){}
}

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
    if(s.liked) state.liked = new Set(s.liked);
    if(s.playlists) state.playlists = s.playlists;
    if(s.recentSearches) state.recentSearches = s.recentSearches;
    if(s.driveConnected !== undefined) state.driveConnected = s.driveConnected;
    if(s.driveEmail) state.driveEmail = s.driveEmail;
    if(s.volume !== undefined) state.volume = s.volume;
    if(s.shuffle !== undefined) state.shuffle = s.shuffle;
    if(s.repeat !== undefined) state.repeat = s.repeat;
    if(s.crossfade !== undefined) state.crossfade = s.crossfade;
    if(s.eqEnabled !== undefined) state.eqEnabled = s.eqEnabled;
    if(s.eqBands) state.eqBands = s.eqBands;
    // Restore recentlyPlayed order from saved IDs (resolved after tracks load)
    if(s.recentlyPlayed && Array.isArray(s.recentlyPlayed)){
      state._savedRecentIds = s.recentlyPlayed;
    }
  }catch(e){ console.warn('loadState error:', e); }
}

function resolveRecentlyPlayed(){
  if(!state._savedRecentIds || !state.tracks.length) return;
  const byId = {};
  state.tracks.forEach(t=>{ byId[t.id]=t; });
  state.recentlyPlayed = state._savedRecentIds
    .map(id=>byId[id])
    .filter(Boolean);
  delete state._savedRecentIds;
}

