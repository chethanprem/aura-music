// ═══════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════
function getTrackEmoji(t){
  const g = {Chill:'🌙',Electronic:'🎹','Hip Hop':'🎤',Pop:'🎵',Rock:'🎸',Jazz:'🎷',Classical:'🎻',Workout:'💪'};
  return g[t.genre] || (t.source === 'drive' ? '☁️' : '🎵');
}

function formatTime(s){
  s = Math.floor(s || 0);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function renderAll(){
  renderHome();
  renderLibrary();
  renderPlaylists();
}

// ── Home ─────────────────────────────────────────────
function renderHome(){
  const h = new Date().getHours();
  const el = document.getElementById('home-greeting');
  if(el) el.textContent = h<12?'Good morning':h<18?'Good afternoon':'Good evening';

  const row = document.getElementById('made-for-you-row');
  if(!state.tracks.length){
    row.innerHTML = `
      <div class="playlist-card" onclick="switchTab('library')">
        <div class="cover" style="background:#4c1d95;display:flex;align-items:center;justify-content:center;"><span style="font-size:2.5rem;">🎵</span></div>
        <p class="pc-name">Add Music</p><p class="pc-sub">Pick files or folder</p>
      </div>
      <div class="playlist-card" onclick="openDriveModal()">
        <div class="cover" style="background:#1e3a5f;display:flex;align-items:center;justify-content:center;"><span style="font-size:2.5rem;">☁️</span></div>
        <p class="pc-name">Google Drive</p><p class="pc-sub">Stream from cloud</p>
      </div>`;
  } else {
    const liked = state.tracks.filter(t => state.liked.has(t.id));
    const recent = (state.recentlyPlayed||[]).slice(0,4);
    const artists = [...new Set(state.tracks.map(t=>t.artist))];
    const albums  = [...new Set(state.tracks.map(t=>t.album))];
    const colors = ['#4c1d95','#1e3a5f','#064e3b','#7f1d1d','#1c1917'];
    const cards = [];
    if(liked.length)   cards.push({name:'Liked Songs',sub:liked.length+' songs',icon:'❤️',tracks:liked});
    if(recent.length)  cards.push({name:'Recently Played',sub:recent.length+' songs',icon:'🕐',tracks:recent});
    if(artists.length) cards.push({name:artists[0],sub:'Top artist',icon:'🎤',tracks:state.tracks.filter(t=>t.artist===artists[0])});
    if(albums.length)  cards.push({name:albums[0],sub:'Album',icon:'💿',tracks:state.tracks.filter(t=>t.album===albums[0])});
    cards.push({name:'Shuffle All',sub:state.tracks.length+' songs',icon:'🔀',tracks:null});
    window._homeCards = cards;
    row.innerHTML = cards.slice(0,5).map((c,i)=>`
      <div class="playlist-card" onclick="homeCardPlay(${i})">
        <div class="cover" style="background:${colors[i%colors.length]};display:flex;align-items:center;justify-content:center;"><span style="font-size:2.5rem;">${c.icon}</span></div>
        <p class="pc-name">${c.name}</p><p class="pc-sub">${c.sub}</p>
      </div>`).join('');
  }

  const list = document.getElementById('recently-played-list');
  const tracks = (state.recentlyPlayed||[]).length
    ? state.recentlyPlayed.slice(0,8)
    : state.tracks.slice(0,8);
  list.innerHTML = tracks.length
    ? tracks.map(t => trackRowHTML(t, state.tracks.indexOf(t), 'home')).join('')
    : `<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:.85rem;">
         Add music in Library to see it here.<br/>
         <button onclick="switchTab('library')" style="margin-top:10px;padding:8px 20px;border-radius:50px;background:var(--accent);color:white;font-size:.82rem;font-weight:700;border:none;cursor:pointer;">Go to Library</button>
       </div>`;
}

function homeCardPlay(i){
  const c = (window._homeCards||[])[i];
  if(!c) return;
  const list = c.tracks?.length ? c.tracks : state.tracks;
  state.shuffle = !c.tracks || c.name === 'Shuffle All';
  playTrack(state.shuffle ? Math.floor(Math.random()*list.length) : 0, list);
}

// ── Track row ────────────────────────────────────────
function trackRowHTML(t, idx, ctx){
  if(idx < 0) idx = state.tracks.indexOf(t);
  const isActive = currentTrack()?.id === t.id;
  return `
    <div class="track-row ${isActive?'active-track':''}" onclick="playTrack(${idx})">
      <div class="track-thumb">${t.thumb ? `<img src="${t.thumb}" alt=""/>` : getTrackEmoji(t)}</div>
      <div class="track-info">
        <div class="track-title">${t.title}</div>
        <div class="track-artist">${t.artist}${t.source==='drive'?' ☁️':''}</div>
      </div>
      ${t.duration ? `<span class="track-dur">${formatTime(t.duration)}</span>` : ''}
      <button class="track-menu-btn" onclick="event.stopPropagation();openContextMenu(${idx})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>`;
}

function highlightActiveTrack(){
  document.querySelectorAll('.track-row').forEach(el => {
    const idx = parseInt(el.getAttribute('data-idx'));
    el.classList.toggle('active-track', state.queue[state.currentIndex]?.id === state.tracks[idx]?.id);
  });
}

// ── Library ──────────────────────────────────────────
function renderLibrary(){
  const empty = document.getElementById('library-empty');
  const list  = document.getElementById('library-tracks-list');
  const tracks = state.tracks;
  if(empty) empty.style.display = tracks.length ? 'none' : 'flex';
  if(list)  list.innerHTML = tracks.map((t,i) => trackRowHTML(t,i,'lib')).join('');
}

function updateLikedCount(){
  const n = state.tracks.filter(t => state.liked.has(t.id)).length;
  const el = document.getElementById('stat-liked');
  if(el) el.textContent = n;
}

// ── Playlists ────────────────────────────────────────
function renderPlaylists(){
  const st = document.getElementById('stat-tracks');
  const sl = document.getElementById('stat-liked');
  const sp = document.getElementById('stat-playlists');
  if(st) st.textContent = state.tracks.length;
  if(sl) sl.textContent = state.tracks.filter(t => state.liked.has(t.id)).length;
  if(sp) sp.textContent = state.playlists.length;

  const list = document.getElementById('playlists-list');
  if(!list) return;
  if(!state.playlists.length){
    list.innerHTML = `<div class="empty-state"><span class="es-icon">📋</span><p>No playlists yet.<br/>Create one to organize your music.</p><button onclick="createPlaylist()" style="background:var(--accent);color:#fff;padding:8px 20px;border-radius:50px;border:none;cursor:pointer;font-weight:700;">Create Playlist</button></div>`;
    return;
  }
  list.innerHTML = state.playlists.map((pl,i) => `
    <div class="playlist-list-row" onclick="openPlaylist(${i})">
      <div class="pl-cover">${pl.thumb ? `<img src="${pl.thumb}" alt=""/>` : '🎵'}</div>
      <div class="pl-info">
        <div class="pl-name">${pl.name}</div>
        <div class="pl-sub">${pl.tracks.length} songs</div>
      </div>
      <button class="pl-menu" onclick="event.stopPropagation();openPlaylistMenu(${i})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>`).join('');
}

// ── Settings ─────────────────────────────────────────
function renderSettings(){
  const crossfadeLabels = ['Off','1s','2s','3s','5s'];
  const sleepOpts  = [0,15,30,45,60,90];
  const sleepNames = ['Off','15 min','30 min','45 min','60 min','90 min'];
  const sleepIdx   = Math.max(0, sleepOpts.indexOf(state.sleepMinutes));

  document.getElementById('settings-list').innerHTML = `
    <div class="settings-section">
      <p class="section-title">Music Sources</p>
      <div class="settings-row" onclick="openDriveModal()">
        <div class="settings-row-left">
          <span class="settings-icon">☁️</span>
          <div><div class="sr-title">Google Drive</div>
          <div class="sr-sub" id="drive-settings-status">${state.driveConnected ? 'Synced · ' + state.driveEmail : 'Not connected'}</div></div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div class="settings-row" onclick="switchTab('library')">
        <div class="settings-row-left">
          <span class="settings-icon">📱</span>
          <div><div class="sr-title">Local Files</div>
          <div class="sr-sub">${state.tracks.filter(t=>t.source==='local').length} songs loaded</div></div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
    <div class="settings-section">
      <p class="section-title">Playback</p>
      <div class="settings-row" onclick="switchTab('eq')">
        <div class="settings-row-left"><span class="settings-icon">🎚️</span><div><div class="sr-title">Equalizer</div><div class="sr-sub">${state.eqEnabled?'On':'Off'}</div></div></div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div class="settings-row" onclick="cycleCrossfade()">
        <div class="settings-row-left"><span class="settings-icon">🔀</span><div><div class="sr-title">Crossfade</div><div class="sr-sub" id="crossfade-val">${crossfadeLabels[state.crossfade]||'Off'}</div></div></div>
      </div>
      <div class="settings-row" onclick="setSleepTimer()">
        <div class="settings-row-left"><span class="settings-icon">😴</span><div><div class="sr-title">Sleep Timer</div><div class="sr-sub" id="sleep-timer-val">${sleepNames[sleepIdx]}</div></div></div>
      </div>
    </div>
    <div class="settings-section">
      <p class="section-title">Data</p>
      <div class="settings-row" onclick="clearCache()">
        <div class="settings-row-left"><span class="settings-icon">🗑️</span><div><div class="sr-title">Clear Library</div><div class="sr-sub">${state.tracks.length} songs in memory</div></div></div>
      </div>
    </div>`;
}

// ── EQ ───────────────────────────────────────────────
function renderEQ(){
  const labels = ['60Hz','230Hz','910Hz','4kHz','14kHz','6kHz','14kHz'];
  const presets = Object.keys(EQ_PRESETS);
  document.getElementById('eq-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <span style="font-size:.9rem;font-weight:600;">Enable EQ</span>
      <label style="position:relative;display:inline-block;width:44px;height:24px;">
        <input type="checkbox" id="eq-enable" ${state.eqEnabled?'checked':''} onchange="toggleEQ(this.checked)" style="opacity:0;width:0;height:0;"/>
        <span style="position:absolute;cursor:pointer;inset:0;border-radius:24px;background:${state.eqEnabled?'var(--accent)':'var(--border)'};transition:.2s;"></span>
        <span style="position:absolute;top:3px;left:${state.eqEnabled?'23':'3'}px;width:18px;height:18px;border-radius:50%;background:white;transition:.2s;"></span>
      </label>
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:20px;padding-bottom:4px;">
      ${presets.map(p=>`<button class="pill" onclick="applyPreset('${p}',this)">${p}</button>`).join('')}
    </div>
    <div id="eq-bands" style="display:flex;gap:8px;justify-content:space-between;height:160px;align-items:flex-end;">
      ${state.eqBands.map((v,i)=>`
        <div class="eq-band">
          <span style="font-size:.6rem;color:var(--accent3);font-weight:700;">${v>0?'+':''}${v}</span>
          <input type="range" class="eq-slider" min="-12" max="12" value="${v}"
            style="--pct:${((v+12)/24*100)}%" ${!state.eqEnabled?'disabled':''}
            oninput="setEQBand(${i},this.value,this)"/>
          <span class="eq-band-label">${labels[i]}</span>
        </div>`).join('')}
    </div>
    <button onclick="resetEQ()" style="width:100%;margin-top:16px;padding:10px;border-radius:var(--radius);border:1px solid var(--border);color:var(--muted);font-size:.85rem;cursor:pointer;background:none;">Reset to Default</button>`;
}

function setEQBand(i, val, el){
  state.eqBands[i] = Number(val);
  if(eqNodes[i]) eqNodes[i].gain.value = state.eqEnabled ? Number(val) : 0;
  el.style.setProperty('--pct', ((Number(val)+12)/24*100)+'%');
  el.previousElementSibling.textContent = (val>0?'+':'')+val;
  saveState();
}

function applyPreset(name){
  const vals = EQ_PRESETS[name] || [0,0,0,0,0,0,0];
  state.eqBands = [...vals];
  applyEQBands();
  renderEQ();
  saveState();
  showSnack(name + ' preset applied');
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
  saveState();
  showSnack('EQ reset');
}
