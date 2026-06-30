let _snackTimer = null;
function showSnack(msg, dur=2800){
  const s = document.getElementById('snackbar');
  if(!s) return;
  s.textContent = msg;
  s.classList.add('show');
  clearTimeout(_snackTimer);
  _snackTimer = setTimeout(() => s.classList.remove('show'), dur);
}
