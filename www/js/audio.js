// ═══════════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════════
function initAudio(){
  if(audio) return;
  audio = new Audio();
  audio.volume = state.volume;
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('ended', onTrackEnded);
  audio.addEventListener('loadedmetadata', onMetaLoaded);
  audio.addEventListener('error', ()=>{ showSnack('Error playing track'); nextTrack(); });
}

function setupAudioContext(){
  if(audioCtx) return;
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(audio);
    gainNode = audioCtx.createGain();
    gainNode.gain.value = state.volume;
    // Create EQ nodes (biquad filters)
    eqNodes = EQ_FREQS.map((freq, i)=>{
      const f = audioCtx.createBiquadFilter();
      f.type = i===0 ? 'lowshelf' : i===EQ_FREQS.length-1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = state.eqBands[i] || 0;
      return f;
    });
    let chain = src;
    eqNodes.forEach(n=>{ chain.connect(n); chain = n; });
    chain.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }catch(e){ console.warn('AudioContext unavailable'); }
}

function applyEQBands(){
  if(!eqNodes.length) return;
  eqNodes.forEach((n,i)=>{
    n.gain.value = state.eqEnabled ? (state.eqBands[i]||0) : 0;
  });
}

