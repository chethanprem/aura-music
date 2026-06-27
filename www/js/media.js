// ═══════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════
function renderAll(){
  try{ renderHome(); }catch(e){ console.error('renderHome:', e); }
  try{ renderLibrary(); }catch(e){ console.error('renderLibrary:', e); }
  try{ renderPlaylists(); }catch(e){ console.error('renderPlaylists:', e); }
  try{ renderSettings(); }catch(e){ console.error('renderSettings:', e); }
}

// ═══════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
document.addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT') return;
  if(e.code==='Space'){ e.preventDefault(); togglePlay(); }
  if(e.code==='ArrowRight') nextTrack();
  if(e.code==='ArrowLeft') prevTrack();
});

// ═══════════════════════════════════════════════════════
// MEDIA SESSION API (lock screen controls)
// ═══════════════════════════════════════════════════════
function updateMediaSession(t){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist,
    album: t.album,
    artwork: t.thumb ? [{src:t.thumb,sizes:'512x512',type:'image/jpeg'}] : [],
  });
  navigator.mediaSession.setActionHandler('play', togglePlay);
  navigator.mediaSession.setActionHandler('pause', togglePlay);
  navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  navigator.mediaSession.setActionHandler('seekto', d=>{ if(audio) audio.currentTime=d.seekTime; });
}

