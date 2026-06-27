// ═══════════════════════════════════════════════════════
// SETTINGS ACTIONS
// ═══════════════════════════════════════════════════════
function cycleCrossfade(){
  state.crossfade = (state.crossfade+1)%5;
  const labels = ['Off','1s','2s','3s','5s'];
  document.getElementById('crossfade-val').textContent = labels[state.crossfade];
  saveState();
}

function toggleNormalize(){
  const cb = document.getElementById('normalize-toggle');
  cb.checked = !cb.checked;
  showSnack('Volume normalize ' + (cb.checked ? 'on' : 'off'));
}

function cycleTheme(){
  // For now just shows a snack — full theme switching would reload CSS vars
  showSnack('More themes coming soon!');
}

function toggleDataSaver(){
  const cb = document.getElementById('datasaver-toggle');
  cb.checked = !cb.checked;
  showSnack('Data saver ' + (cb.checked ? 'on' : 'off'));
  saveState();
}

function setSleepTimer(){
  const opts = [0,15,30,45,60,90];
  const labels = ['Off','15 min','30 min','45 min','60 min','90 min'];
  const cur = opts.indexOf(state.sleepMinutes);
  const next = (cur+1) % opts.length;
  state.sleepMinutes = opts[next];
  if(state.sleepTimer) clearTimeout(state.sleepTimer);
  if(state.sleepMinutes){
    state.sleepTimer = setTimeout(()=>{
      if(audio) audio.pause();
      state.isPlaying = false;
      updatePlayButtons();
      showSnack('Sleep timer ended. Playback paused.');
      state.sleepMinutes = 0;
    }, state.sleepMinutes * 60000);
    showSnack(`Sleep timer: ${labels[next]}`);
  } else {
    showSnack('Sleep timer off');
  }
  document.getElementById('sleep-timer-val').textContent = labels[next];
  const tb = document.getElementById('timer-btn');
  if(tb && state.sleepMinutes){
    tb.style.color = 'var(--accent3)';
  } else if(tb) {
    tb.style.color = '';
  }
  saveState();
}

function clearCache(){
  if(confirm('Clear app cache? This will remove downloaded files from memory.')){
    state.tracks.forEach(t=>{ if(t.url && t.url.startsWith('blob:')) URL.revokeObjectURL(t.url); });
    state.tracks = [];
    renderLibrary();
    renderHome();
    showSnack('Cache cleared');
  }
}

