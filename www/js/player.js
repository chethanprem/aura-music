// ═══════════════════════════════════════════════════════
// PLAYBACK CONTROLS
// ═══════════════════════════════════════════════════════
async function playTrack(index, queue){
  const tracks = queue || state.tracks;
  if(!tracks.length){ showSnack('No music — add files in Library'); return; }
  if(index < 0) index = tracks.length - 1;
  if(index >= tracks.length) index = 0;

  state.currentIndex = index;
  state.queue = tracks;
  const t = tracks[index];

  initAudio();

  // Drive tracks: fetch blob first so <audio> can play it
  if(t.source === 'drive'){
    showSnack('Loading from Drive…');
    await refreshDriveUrl(t).catch(e => console.warn(e));
  }

  if(t.url){
    if(audioCtx?.state === 'suspended') audioCtx.resume();
    setupAudioContext();
    audio.src = t.url;
    audio.load();
    audio.play().catch(e => { console.warn('Play error:', e); showSnack('Cannot play: ' + t.title); });
    state.isPlaying = true;
  }

  updatePlayerUI(t);
  updateMiniPlayer(t);
  updatePlayButtons();
  updateMediaSession(t);
  highlightActiveTrack();

  if(!Array.isArray(state.recentlyPlayed)) state.recentlyPlayed = [];
  state.recentlyPlayed = [t, ...state.recentlyPlayed.filter(x => x.id !== t.id)].slice(0, 20);
}

function playDemoTrack(i){ playTrack(i); }

function togglePlay(){
  if(!audio) initAudio();
  if(!state.tracks.length){ showSnack('No music — add files in Library'); return; }
  const t = state.queue[state.currentIndex] || state.tracks[0];
  if(!audio.src && t?.url){ audio.src = t.url; audio.load(); }
  if(state.isPlaying){
    audio.pause();
    state.isPlaying = false;
  } else {
    if(audioCtx?.state === 'suspended') audioCtx.resume();
    setupAudioContext();
    if(audio.src) audio.play().catch(()=>{});
    state.isPlaying = true;
  }
  updatePlayButtons();
}

function prevTrack(){
  if(audio && audio.currentTime > 3){ audio.currentTime = 0; return; }
  playTrack(state.currentIndex - 1, state.queue);
}

function nextTrack(){
  const idx = state.shuffle
    ? Math.floor(Math.random() * state.queue.length)
    : state.currentIndex + 1;
  playTrack(idx, state.queue);
}

function onTrackEnded(){
  if(state.repeat === 2){ audio.currentTime = 0; audio.play(); return; }
  nextTrack();
}

function onMetaLoaded(){
  const t = state.queue[state.currentIndex];
  if(t) t.duration = audio.duration;
  updateSeekUI();
}

function setVolume(val){
  state.volume = val / 100;
  if(audio) audio.volume = state.volume;
  if(gainNode) gainNode.gain.value = state.volume;
  const bar = document.getElementById('vol-bar');
  if(bar) bar.style.setProperty('--pct', val + '%');
  saveState();
}
