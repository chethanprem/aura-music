// ═══════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════
function renderQueue(){
  const list = document.getElementById('queue-list');
  const tracks = state.queue.length ? state.queue : state.tracks;
  list.innerHTML = tracks.map((t,i) => `
    <div class="track-row ${i===state.currentIndex?'active-track':''}" onclick="playTrack(${i},${JSON.stringify([])})">
      <div class="track-thumb">${t.thumb?`<img src="${t.thumb}" alt=""/>`:'🎵'}</div>
      <div class="track-info">
        <div class="track-title">${t.title}</div>
        <div class="track-artist">${t.artist}</div>
      </div>
      ${i===state.currentIndex?'<span style="color:var(--accent2);font-size:.75rem;font-weight:700;">NOW</span>':''}
    </div>`).join('');
}
