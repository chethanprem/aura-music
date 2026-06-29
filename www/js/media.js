// ── Media Session API ────────────────────────────────
function updateMediaSession(t){
  if(!t || !navigator.mediaSession) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: t.album || '',
  });
  navigator.mediaSession.setActionHandler('play',         togglePlay);
  navigator.mediaSession.setActionHandler('pause',        togglePlay);
  navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
  navigator.mediaSession.setActionHandler('nexttrack',     nextTrack);
}
