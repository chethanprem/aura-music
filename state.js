// ═══════════════════════════════════════════════════════
// SETTINGS ACTIONS
// ═══════════════════════════════════════════════════════
function cycleCrossfade(){
  state.crossfade = (state.crossfade + 1) % 5;
  const labels = ['Off','1s','2s','3s','5s'];
  const el = document.getElementById('crossfade-val');
  if(el) el.textContent = labels[state.crossfade];
  saveState();
}

function setSleepTimer(){
  const opts  = [0,15,30,45,60,90];
  const names = ['Off','15 min','30 min','45 min','60 min','90 min'];
  const cur  = opts.indexOf(state.sleepMinutes);
  const next = (cur + 1) % opts.length;
  state.sleepMinutes = opts[next];
  if(state.sleepTimer) clearTimeout(state.sleepTimer);
  if(state.sleepMinutes){
    state.sleepTimer = setTimeout(() => {
      if(audio) audio.pause();
      state.isPlaying = false;
      updatePlayButtons();
      showSnack('Sleep timer ended — playback paused');
      state.sleepMinutes = 0;
    }, state.sleepMinutes * 60000);
    showSnack('Sleep timer: ' + names[next]);
  } else {
    showSnack('Sleep timer off');
  }
  const el = document.getElementById('sleep-timer-val');
  if(el) el.textContent = names[next];
  saveState();
}

function clearCache(){
  if(!confirm('Remove all tracks from library?\nThis does not delete any files.')) return;
  state.tracks.forEach(t => { if(t.url?.startsWith('blob:')) URL.revokeObjectURL(t.url); });
  state.tracks = [];
  state.queue  = [];
  localStorage.removeItem('aura_tracks_v1');
  renderAll();
  showSnack('Library cleared');
}
