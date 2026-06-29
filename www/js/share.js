function shareTrack(){
  const t = currentTrack();
  if(!t) return;
  if(navigator.share){
    navigator.share({ title: t.title, text: `${t.title} by ${t.artist}` }).catch(()=>{});
  } else {
    showSnack('Share: ' + t.title + ' – ' + t.artist);
  }
}
