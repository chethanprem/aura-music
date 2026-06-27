// ═══════════════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════════════
function updatePlayerUI(t){
  if(!t) return;
  document.getElementById('player-song-title').textContent = t.title;
  document.getElementById('player-artist').textContent = t.artist;
  const art = document.getElementById('player-artwork');
  if(t.thumb){ art.innerHTML = `<img src="${t.thumb}" alt=""/>`; }
  else { art.innerHTML = getTrackEmoji(t); }
  if(state.isPlaying) art.classList.add('playing');
  else art.classList.remove('playing');
  updateLikeBtn();
  updateSeekUI();
  // Update document title
  document.title = `${t.title} – Aura Music`;
}

function updateMiniPlayer(t){
  if(!t) return;
  const mp = document.getElementById('mini-player');
  mp.classList.remove('hidden');
  document.getElementById('mini-title').textContent = t.title;
  document.getElementById('mini-artist').textContent = t.artist;
  const thumb = document.getElementById('mini-thumb');
  if(t.thumb){ thumb.innerHTML = `<img src="${t.thumb}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`; }
  else { thumb.textContent = getTrackEmoji(t); }
}

function updatePlayButtons(){
  const icons = {
    play: `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
    pause:`<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    playS:`<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
    pauseS:`<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  };
  const pi = document.getElementById('play-icon');
  const mpi = document.getElementById('mini-play-icon');
  const pa = document.getElementById('player-artwork');
  if(state.isPlaying){
    if(pi) pi.innerHTML = icons.pause;
    if(mpi) mpi.innerHTML = icons.pauseS;
    if(pa) pa.classList.add('playing');
  } else {
    if(pi) pi.innerHTML = icons.play;
    if(mpi) mpi.innerHTML = icons.playS;
    if(pa) pa.classList.remove('playing');
  }
}

function onTimeUpdate(){
  if(seekDragging) return;
  const dur = audio.duration || 1;
  const pct = (audio.currentTime / dur) * 100;
  updateSeekBar(pct);
  document.getElementById('time-current').textContent = formatTime(audio.currentTime);
  document.getElementById('mini-progress').style.width = pct+'%';
}

function updateSeekUI(){
  if(!audio) return;
  const dur = audio.duration || 0;
  document.getElementById('time-total').textContent = formatTime(dur);
}

function updateSeekBar(pct){
  const bar = document.getElementById('seek-bar');
  if(bar){ bar.value = pct; bar.style.setProperty('--pct', pct+'%'); }
}

function onSeekInput(val){
  seekDragging = true;
  document.getElementById('time-current').textContent = formatTime((val/100)*(audio.duration||0));
  updateSeekBar(val);
}
function onSeekChange(val){
  seekDragging = false;
  if(audio && audio.duration) audio.currentTime = (val/100)*audio.duration;
}

function toggleShuffle(){
  state.shuffle = !state.shuffle;
  const btn = document.getElementById('shuffle-btn');
  btn.classList.toggle('active-mode', state.shuffle);
  showSnack(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  saveState();
}

function cycleRepeat(){
  state.repeat = (state.repeat + 1) % 3;
  const btn = document.getElementById('repeat-btn');
  const labels = ['Repeat off','Repeat all','Repeat one'];
  btn.classList.toggle('active-mode', state.repeat > 0);
  if(state.repeat === 2){
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="10" y="15" font-size="6" fill="currentColor">1</text></svg>`;
  } else {
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  }
  showSnack(labels[state.repeat]);
  saveState();
}

function toggleLike(){
  const t = currentTrack();
  if(!t) return;
  const key = t.id;
  if(state.liked.has(key)) state.liked.delete(key);
  else state.liked.add(key);
  updateLikeBtn();
  updateLikedCount();
  saveState();
}

function updateLikeBtn(){
  const t = currentTrack();
  const btn = document.getElementById('like-btn');
  if(!btn || !t) return;
  const liked = state.liked.has(t.id);
  btn.classList.toggle('liked', liked);
  btn.innerHTML = liked
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:var(--danger)"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function currentTrack(){
  const q = state.queue.length ? state.queue : state.tracks;
  return q[state.currentIndex] || null;
}
let currentTrackIndex = 0; // alias for ctx menu

