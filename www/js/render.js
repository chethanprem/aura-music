// ═══════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════
function getTrackEmoji(t){
  const genreMap = {Chill:'🌙',Electronic:'🎹','Hip Hop':'🎤',Pop:'🎵',Rock:'🎸',Jazz:'🎷',Classical:'🎻',Workout:'💪'};
  return genreMap[t.genre] || '🎵';
}

function formatTime(s){
  s = Math.floor(s||0);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function renderHome(){
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('home-greeting').textContent = g;

  const row = document.getElementById('made-for-you-row');
  if(!state.tracks.length){
    // No music yet — show scan prompt cards
    row.innerHTML = `
      <div class="playlist-card" onclick="switchTab('library');scanLocalMusic()">
        <div class="cover" style="background:#4c1d95;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:2.5rem;">🎵</span>
        </div>
        <p class="pc-name">Scan Device</p>
        <p class="pc-sub">Add your music</p>
      </div>
      <div class="playlist-card" onclick="openDriveModal()">
        <div class="cover" style="background:#1e3a5f;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:2.5rem;">☁️</span>
        </div>
        <p class="pc-name">Google Drive</p>
        <p class="pc-sub">Sync from cloud</p>
      </div>`;
  } else {
    // Show auto-generated smart playlists from real tracks
    const allArtists  = [...new Set(state.tracks.map(t=>t.artist))];
    const allAlbums   = [...new Set(state.tracks.map(t=>t.album))];
    const liked       = state.tracks.filter(t=>state.liked.has(t.id));
    const recent      = (state.recentlyPlayed||[]).slice(0,4);
    const bgColors    = ['#4c1d95','#1e3a5f','#064e3b','#7f1d1d','#1c1917','#3b0764'];

    const cards = [];
    if(liked.length)      cards.push({name:'Liked Songs', sub:liked.length+' songs',    icon:'❤️',  tracks:liked});
    if(recent.length)     cards.push({name:'Recently Played', sub:recent.length+' songs', icon:'🕐', tracks:recent});
    if(allArtists.length) cards.push({name:allArtists[0],sub:'Top artist',               icon:'🎤',  tracks:state.tracks.filter(t=>t.artist===allArtists[0])});
    if(allAlbums.length)  cards.push({name:allAlbums[0], sub:'Album',                    icon:'💿',  tracks:state.tracks.filter(t=>t.album===allAlbums[0])});
    // Pad with shuffle card
    cards.push({name:'Shuffle All', sub:state.tracks.length+' songs', icon:'🔀', tracks:null});

    row.innerHTML = cards.slice(0,5).map((c,i)=>`
      <div class="playlist-card" onclick='homeCardPlay(${i})'>
        <div class="cover" style="background:${bgColors[i%bgColors.length]};display:flex;align-items:center;justify-content:center;">
          <span style="font-size:2.5rem;">${c.icon}</span>
        </div>
        <p class="pc-name">${c.name}</p>
        <p class="pc-sub">${c.sub}</p>
      </div>`).join('');

    // Store cards for click handler
    window._homeCards = cards;
  }

  // Recently played / all tracks
  const list = document.getElementById('recently-played-list');
  const tracks = (state.recentlyPlayed||[]).length
    ? state.recentlyPlayed.slice(0,8)
    : state.tracks.slice(0,8);
  list.innerHTML = tracks.length
    ? tracks.map((t,i)=>trackRowHTML(t, state.tracks.indexOf(t) !== -1 ? state.tracks.indexOf(t) : i, 'home')).join('')
    : `<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:.85rem;">
         Scan your device to see music here.<br/>
         <button onclick="switchTab('library')" style="margin-top:10px;padding:8px 20px;border-radius:50px;background:var(--accent);color:white;font-size:.82rem;font-weight:700;cursor:pointer;">Go to Library</button>
       </div>`;
}

function homeCardPlay(i){
  const c = (window._homeCards||[])[i];
  if(!c) return;
  if(c.tracks){
    state.shuffle = c.name === 'Shuffle All';
    playTrack(0, c.tracks.length ? c.tracks : state.tracks);
  } else {
    state.shuffle = true;
    playTrack(Math.floor(Math.random()*state.tracks.length), state.tracks);
  }
}

function trackRowHTML(t, idx, ctx){
  const isActive = currentTrack()?.id === t.id;
  const liked = state.liked.has(t.id);
  return `
    <div class="track-row ${isActive?'active-track':''}" onclick="playTrack(${idx}, ${ctx==='home'?'null':'null'})">
      <div class="track-thumb">
        ${t.thumb ? `<img src="${t.thumb}" alt=""/>` : getTrackEmoji(t)}
      </div>
      <div class="track-info">
        <div class="track-title">${t.title}</div>
        <div class="track-artist">${t.artist}</div>
      </div>
      ${t.duration ? `<span class="track-dur">${formatTime(t.duration)}</span>` : ''}
      <button class="track-menu-btn" onclick="event.stopPropagation();openContextMenu(${idx})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>`;
}

function highlightActiveTrack(){
  document.querySelectorAll('.track-row').forEach((el,i)=>{
    el.classList.toggle('active-track', i === state.currentIndex);
  });
}

function renderLibrary(){
  const tracks = state.tracks;
  const empty = document.getElementById('library-empty');
  const list = document.getElementById('library-tracks-list');
  if(!tracks.length){
    empty.style.display = 'flex';
    document.getElementById('library-empty-msg').textContent = 'Tap to scan music on this device';
    document.getElementById('library-scan-btn').textContent = 'Scan Device';
    list.innerHTML = '';
  } else {
    empty.style.display = 'none';
    list.innerHTML = tracks.map((t,i)=>trackRowHTML(t,i,'lib')).join('');
  }
  updateLikedCount();
  document.getElementById('playlists-count').textContent = state.playlists.length + ' playlists';
  // Count unique albums/artists
  const albums = new Set(tracks.map(t=>t.album)).size;
  const artists = new Set(tracks.map(t=>t.artist)).size;
  document.getElementById('albums-count').textContent = albums + ' albums';
  document.getElementById('artists-count').textContent = artists + ' artists';
  const liked = tracks.filter(t=>state.liked.has(t.id)).length;
  const dlCount = document.getElementById('downloads-count');
  if(dlCount) dlCount.textContent = tracks.length + ' songs';
}

function updateLikedCount(){
  const liked = state.tracks.filter(t=>state.liked.has(t.id)).length;
  document.getElementById('liked-count').textContent = liked + ' songs';
}

function renderPlaylists(){
  const list = document.getElementById('playlists-list');
  if(!state.playlists.length){
    list.innerHTML = `<div class="empty-state"><span class="es-icon">📋</span><p>No playlists yet.<br/>Create one to organize your music.</p><button onclick="createPlaylist()">Create Playlist</button></div>`;
    return;
  }
  list.innerHTML = state.playlists.map((pl,i)=>`
    <div class="playlist-list-row" onclick="openPlaylist(${i})">
      <div class="pl-cover">${pl.thumb?`<img src="${pl.thumb}" alt=""/>`:'🎵'}</div>
      <div class="pl-info">
        <div class="pl-name">${pl.name}</div>
        <div class="pl-sub">${pl.tracks.length} songs</div>
      </div>
      <button class="pl-menu" onclick="event.stopPropagation();openPlaylistMenu(${i})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>`).join('');
}

function renderSettings(){
  document.getElementById('drive-settings-status').textContent = state.driveConnected ? ('Synced · '+state.driveEmail) : 'Not connected';
  document.getElementById('drive-lib-status').textContent = state.driveConnected ? 'Linked' : 'Not linked';
  const crossfadeLabels = ['Off','1s','2s','3s','5s'];
  document.getElementById('crossfade-val').textContent = crossfadeLabels[state.crossfade] || 'Off';
  // Storage
  let sz = 0;
  state.tracks.forEach(t=>{ if(t.file) sz += t.file.size||0; });
  document.getElementById('storage-used').textContent = (sz/1024/1024).toFixed(1)+' MB used';
  // Sleep
  document.getElementById('sleep-timer-val').textContent = state.sleepMinutes ? state.sleepMinutes+'min' : 'Off';
}

function renderEQ(){
  // Build bands
  const bands = document.getElementById('eq-bands');
  const labels = ['60Hz','230','910','4k','14k','6k','14k'];
  bands.innerHTML = state.eqBands.map((v,i)=>`
    <div class="eq-band">
      <span style="font-size:.6rem;color:var(--accent3);font-weight:700;">${v>0?'+':''}${v}dB</span>
      <input type="range" class="eq-slider" min="-12" max="12" value="${v}"
        style="--pct:${((v+12)/24*100)}%"
        oninput="setEQBand(${i},this.value,this)"
        ${!state.eqEnabled?'disabled':''}/>
      <span class="eq-band-label">${labels[i]}</span>
    </div>`).join('');
  document.getElementById('eq-enable').checked = state.eqEnabled;
}

function setEQBand(i, val, el){
  state.eqBands[i] = Number(val);
  if(eqNodes[i]) eqNodes[i].gain.value = state.eqEnabled ? Number(val) : 0;
  el.style.setProperty('--pct', ((Number(val)+12)/24*100)+'%');
  // Update label above slider
  el.previousElementSibling.textContent = (val>0?'+':'')+val+'dB';
  saveState();
}

function applyPreset(name, el){
  document.querySelectorAll('.preset-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  const vals = EQ_PRESETS[name] || [0,0,0,0,0,0,0];
  state.eqBands = [...vals];
  applyEQBands();
  renderEQ();
  saveState();
}

function toggleEQ(on){
  state.eqEnabled = on;
  applyEQBands();
  renderEQ();
  saveState();
}

function resetEQ(){
  state.eqBands = [0,0,0,0,0,0,0];
  applyEQBands();
  renderEQ();
  document.querySelectorAll('.preset-chip').forEach((c,i)=>c.classList.toggle('active',i===0));
  showSnack('EQ reset to default');
  saveState();
}

let bassVal=0, virtVal=0;
function cycleKnob(type){
  if(type==='bass'){
    bassVal = (bassVal + 3) % 13;
    document.getElementById('bass-val').textContent = (bassVal>0?'+':'')+bassVal+'dB';
    const pct = (bassVal/12*100);
    document.getElementById('bass-knob').style.background = `conic-gradient(var(--accent) 0% ${pct}%,var(--border) ${pct}% 100%)`;
    if(eqNodes[0]) eqNodes[0].gain.value = bassVal;
  } else {
    virtVal = (virtVal + 10) % 110;
    document.getElementById('virt-val').textContent = virtVal+'%';
    const pct = virtVal;
    document.getElementById('virt-knob').style.background = `conic-gradient(var(--accent) 0% ${pct}%,var(--border) ${pct}% 100%)`;
  }
}

