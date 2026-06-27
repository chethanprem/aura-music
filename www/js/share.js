// ═══════════════════════════════════════════════════════
// SHARE
// ═══════════════════════════════════════════════════════
function shareTrack(){
  const t = currentTrack();
  if(!t){ showSnack('Nothing playing'); return; }
  if(navigator.share){
    navigator.share({ title: t.title, text: `${t.title} by ${t.artist}`, url: location.href })
      .catch(()=>{});
  } else {
    navigator.clipboard?.writeText(`${t.title} by ${t.artist}`)
      .then(()=>showSnack('Copied to clipboard'))
      .catch(()=>showSnack('Share: '+t.title+' – '+t.artist));
  }
}

