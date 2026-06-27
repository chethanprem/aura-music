// ═══════════════════════════════════════════════════════
// PLAYBACK CONTROLS
// ═══════════════════════════════════════════════════════
function playTrack(index, queue){
  const tracks = queue || state.tracks;
  if(!tracks.length){ showSnack('No music yet — tap Scan Device in Library'); return; }
  if(index < 0) index = tracks.length - 1;
  if(index >= tracks.length) index = 0;
  state.currentIndex = index;
  state.queue = tracks;
  const t = tracks[index];
  initAudio();
  if(t.url){
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    setupAudioContext();
    // Refresh Drive streaming URL (tokens expire in 1h)
    if(t.source === 'drive') refreshDriveUrl(t);
    audio.src = t.url;
    audio.load();
    audio.play().catch(e=>{ console.warn('Play error:', e); showSnack('Cannot play: ' + t.title); });
    state.isPlaying = true;
  }
  updatePlayerUI(t);
  updateMiniPlayer(t);
  updatePlayButtons();
  updateMediaSession(t);
  highlightActiveTrack();
  // Track recently played (ring buffer, no dupes)
  if(!Array.isArray(state.recentlyPlayed)) state.recentlyPlayed = [];
  state.recentlyPlayed = [t, ...state.recentlyPlayed.filter(x=>x.id!==t.id)].slice(0,20);
}

function playDemoTrack(i){ playTrack(i); }

function togglePlay(){
  if(!audio){ initAudio(); }
  if(!state.tracks.length){ showSnack('No music yet — tap Scan Device in Library'); return; }
  const t = state.queue[state.currentIndex] || state.tracks[0];
  if(!audio.src && t?.url){
    audio.src = t.url;
    audio.load();
  }
  if(state.isPlaying){
    audio.pause();
    state.isPlaying = false;
  } else {
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    setupAudioContext();
    if(audio.src) audio.play().catch(e=>{});
    state.isPlaying = true;
  }
  updatePlayButtons();
}

function prevTrack(){
  if(audio && audio.currentTime > 3){ audio.currentTime = 0; return; }
  let idx = state.currentIndex - 1;
  if(idx < 0) idx = state.queue.length - 1;
  playTrack(idx, state.queue);
}

function nextTrack(){
  let idx;
  if(state.shuffle){
    idx = Math.floor(Math.random() * state.queue.length);
  } else {
    idx = state.currentIndex + 1;
    if(idx >= state.queue.length) idx = 0;
  }
  playTrack(idx, state.queue);
}

function onTrackEnded(){
  if(state.repeat === 2){ audio.currentTime=0; audio.play(); return; }
  nextTrack();
}

function onMetaLoaded(){
  const t = state.queue[state.currentIndex];
  if(t) t.duration = audio.duration;
  updateSeekUI();
  renderLibrary(); // update durations
}

function setVolume(val){
  state.volume = val/100;
  if(audio) audio.volume = state.volume;
  if(gainNode) gainNode.gain.value = state.volume;
  const bar = document.getElementById('vol-bar');
  if(bar) bar.style.setProperty('--pct', val+'%');
  saveState();
}

