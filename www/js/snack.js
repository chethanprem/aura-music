// ═══════════════════════════════════════════════════════
// SNACKBAR
// ═══════════════════════════════════════════════════════
let snackTimer;
function showSnack(msg){
  const el = document.getElementById('snackbar');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(()=>el.classList.remove('show'), 2800);
}

