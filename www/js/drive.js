// ── GOOGLE DRIVE ─────────────────────────────────────────────────
// Real OAuth2 via Google Identity Services + Drive API v3.
//
// HOW TO GET YOUR CLIENT ID (one time setup):
//   1. Go to https://console.cloud.google.com
//   2. Create a new project (name it anything)
//   3. Left menu → APIs & Services → Library
//      Search "Google Drive API" → Enable it
//   4. Left menu → APIs & Services → OAuth consent screen
//      → External → Fill app name "Aura Music" → Save
//      → Scopes → Add: .../auth/drive.readonly → Save
//   5. Left menu → Credentials → + Create Credentials
//      → OAuth 2.0 Client ID → Web application
//      → Authorised JavaScript origins → + Add URI:
//         https://localhost
//      → Create → COPY the Client ID shown
//   6. Paste it below replacing the empty string ↓
// ─────────────────────────────────────────────────────────────────

var DRIVE_CLIENT_ID = '';   // ← PASTE YOUR CLIENT ID HERE

var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly email profile';
var DRIVE_BASE  = 'https://www.googleapis.com/drive/v3';
var AUDIO_MIMES = [
  'audio/mpeg','audio/mp3','audio/flac','audio/wav','audio/aac',
  'audio/ogg','audio/x-m4a','audio/mp4','audio/opus','audio/x-wav',
];

window._driveToken  = '';
window._driveClient = null;

// ── Connect / Disconnect ─────────────────────────────────────────
function driveToggleConnect() {
  if (APP.driveConnected) {
    if (!confirm('Disconnect Google Drive?')) return;
    window._driveToken = '';
    APP.driveConnected = false;
    APP.driveEmail     = '';
    APP.tracks = APP.tracks.filter(function(t) { return t.source !== 'drive'; });
    saveTracks();
    savePrefs();
    renderLibrary();
    renderHome();
    _updateDriveSettingsUI();
    showSnack('Google Drive disconnected');
    return;
  }

  // No Client ID set — show inline setup prompt instead of crashing
  if (!DRIVE_CLIENT_ID) {
    _showClientIdPrompt();
    return;
  }

  _connectDrive();
}

// ── Show inline Client ID entry ───────────────────────────────────
function _showClientIdPrompt() {
  var id = prompt(
    'Paste your Google OAuth Client ID below.\n\n' +
    'Get it from: console.cloud.google.com\n' +
    'APIs & Services → Credentials → OAuth 2.0 Client ID\n' +
    '(Type: Web application, Origin: https://localhost)\n\n' +
    'Client ID:'
  );
  if (!id || !id.trim()) {
    showSnack('No Client ID entered');
    return;
  }
  id = id.trim();
  if (id.indexOf('.apps.googleusercontent.com') === -1) {
    showSnack('That does not look like a valid Client ID');
    return;
  }
  // Save it for this session and persist
  DRIVE_CLIENT_ID = id;
  try { localStorage.setItem('aura_drive_cid', id); } catch(e) {}
  showSnack('Client ID saved \u2713 Connecting…');
  _connectDrive();
}

// ── Actually start OAuth flow ─────────────────────────────────────
function _connectDrive() {
  _loadGSI().then(function() {
    window._driveClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CLIENT_ID,
      scope:     DRIVE_SCOPE,
      callback:  _onDriveToken,
    });
    window._driveClient.requestAccessToken({ prompt: 'consent' });
  }).catch(function(e) {
    showSnack('Could not load Google Sign-In: ' + e.message);
  });
}

function _onDriveToken(resp) {
  if (resp.error) { showSnack('Sign-in error: ' + resp.error); return; }
  window._driveToken = resp.access_token;
  _driveGet('/about?fields=user').then(function(data) {
    APP.driveConnected = true;
    APP.driveEmail     = (data.user && data.user.emailAddress) || '';
    savePrefs();
    _updateDriveSettingsUI();
    showSnack('Google Drive connected \u2713');
    driveSyncNow();
  }).catch(function(e) {
    showSnack('Drive auth failed: ' + e.message);
  });
}

// ── Sync ─────────────────────────────────────────────────────────
function driveSyncNow() {
  if (!APP.driveConnected || !window._driveToken) {
    showSnack('Connect Google Drive first');
    return;
  }
  var syncEl = document.getElementById('drive-last-sync');
  if (syncEl) syncEl.textContent = 'Syncing…';
  showSnack('Scanning Google Drive for audio…');

  var mimeQ = AUDIO_MIMES.map(function(m) { return "mimeType='" + m + "'"; }).join(' or ');
  var q     = '(' + mimeQ + ') and trashed=false';

  _driveListAll('/files', {
    q:        q,
    fields:   'nextPageToken,files(id,name,mimeType)',
    pageSize: '1000',
    orderBy:  'name',
  }).then(function(files) {
    if (!files.length) {
      if (syncEl) syncEl.textContent = 'No audio in Drive';
      showSnack('No music files found in Google Drive');
      return;
    }

    // Remove stale Drive tracks and re-add
    APP.tracks = APP.tracks.filter(function(t) { return t.source !== 'drive'; });

    files.forEach(function(file) {
      var bare   = file.name.replace(/\.[^.]+$/, '');
      var title  = bare;
      var artist = 'Google Drive';
      var m = bare.match(/^(.+?)\s*[-\u2013]\s*(.+)$/);
      if (m) { artist = m[1].trim(); title = m[2].trim(); }
      APP.tracks.push({
        id:       file.id,
        title:    title,
        artist:   artist,
        album:    'Google Drive',
        url:      DRIVE_BASE + '/files/' + file.id + '?alt=media&access_token=' + window._driveToken,
        thumb:    null,
        duration: 0,
        genre:    '',
        source:   'drive',
        driveId:  file.id,
      });
    });

    saveTracks();
    savePrefs();
    renderLibrary();
    renderHome();

    var now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    if (syncEl) syncEl.textContent = 'Synced ' + now + ' \u00b7 ' + files.length + ' files';
    showSnack('Loaded ' + files.length + ' songs from Drive \uD83C\uDFB5');
  }).catch(function(e) {
    if (syncEl) syncEl.textContent = 'Sync failed — tap to retry';
    showSnack('Drive sync failed: ' + e.message);
  });
}

// ── Helpers ──────────────────────────────────────────────────────
function _driveGet(path) {
  return fetch(DRIVE_BASE + path, {
    headers: { Authorization: 'Bearer ' + window._driveToken }
  }).then(function(r) {
    if (!r.ok) throw new Error('Drive API ' + r.status);
    return r.json();
  });
}

function _driveListAll(path, params) {
  var all = [];
  function page(token) {
    var p  = {};
    Object.keys(params).forEach(function(k) { p[k] = params[k]; });
    if (token) p.pageToken = token;
    var qs = Object.keys(p).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
    return fetch(DRIVE_BASE + path + '?' + qs, {
      headers: { Authorization: 'Bearer ' + window._driveToken }
    }).then(function(r) {
      if (!r.ok) throw new Error('Drive API ' + r.status);
      return r.json();
    }).then(function(data) {
      all = all.concat(data.files || []);
      return data.nextPageToken ? page(data.nextPageToken) : all;
    });
  }
  return page('');
}

function _loadGSI() {
  return new Promise(function(resolve, reject) {
    if (window.google && window.google.accounts) { resolve(); return; }
    var s    = document.createElement('script');
    s.src    = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    s.onerror = function() { reject(new Error('Failed to load Google Sign-In script')); };
    document.head.appendChild(s);
  });
}

function _updateDriveSettingsUI() {
  var badge   = document.getElementById('drive-badge');
  var status  = document.getElementById('drive-status-text');
  var syncRow = document.getElementById('drive-sync-row');
  var libSt   = document.getElementById('lc-drive-status');

  if (APP.driveConnected) {
    if (badge)   { badge.textContent = 'On'; badge.className = 'badge badge-on'; }
    if (status)  status.textContent = APP.driveEmail || 'Connected';
    if (syncRow) syncRow.style.display = '';
    if (libSt)   libSt.textContent = 'Linked';
  } else {
    if (badge)   { badge.textContent = 'Off'; badge.className = 'badge badge-off'; }
    if (status)  status.textContent = 'Tap to connect';
    if (syncRow) syncRow.style.display = 'none';
    if (libSt)   libSt.textContent = 'Not linked';
  }
}

// Restore saved Client ID from previous session
(function() {
  try {
    var saved = localStorage.getItem('aura_drive_cid');
    if (saved && saved.indexOf('.apps.googleusercontent.com') !== -1) {
      DRIVE_CLIENT_ID = saved;
    }
  } catch(e) {}
})();
