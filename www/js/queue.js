// ═══════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════
function renderQueue(){
  const q = state.queue.length ? state.queue : state.tracks;
  const list = document.getElementById('queue-list');
  list.innerHTML = q.map((t,i)=>`
    <div class="track-row ${i===state.currentIndex?'active-track':''}" onclick="playTrack(${i},null);closeQueue()">
      <div class="track-thumb">${t.thumb?`<img src="${t.thumb}"/>`:'🎵'}</div>
      <div class="track-info">
        <div class="track-title">${t.title}</div>
        <div class="track-artist">${t.artist}</div>
      </div>
      ${i===state.currentIndex ? '<span style="color:var(--accent3);font-size:.7rem;font-weight:700;">NOW</span>' : ''}
    </div>`).join('');
}

