// ── GOOGLE DRIVE ─────────────────────────────────────────────────
// Real OAuth2 via Google Identity Services + Drive API v3.
//
// SETUP:
//   1. console.cloud.google.com → New Project
//   2. APIs & Services → Enable "Google Drive API"
//   3. OAuth consent screen → External → add scope:
//      https://www.googleapis.com/auth/drive.readonly
//   4. Credentials → OAuth 2.0 Client ID → Web application
//      Authorised JS origins: https://localhost
//   5. Paste your Client ID below ↓
// ─────────────────────────────────────────────────────────────────

var DRIVE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
var DRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.readonly email profile';
var DRIVE_BASE      = 'https://www.googleapis.com/drive/v3';
var AUDIO_MIMES     = [
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
    // Remove Drive tracks from library
    APP.tracks = APP.tracks.filter(function(t) { return t.source !== 'drive'; });
    saveTracks();
    savePrefs();
    renderLibrary();
    renderHome();
    _updateDriveSettingsUI();
    showSnack('Google Drive disconnected');
    return;
  }

  if (DRIVE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    showSnack('Open index.html and set your Google Client ID in drive.js');
    return;
  }

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

  // Get user email
  _driveGet('/about?fields=user').then(function(data) {
    APP.driveConnected = true;
    APP.driveEmail     = (data.user && data.user.emailAddress) || '';
    savePrefs();
    _updateDriveSettingsUI();
    showSnack('Google Drive connected \u2713');
    // Auto-sync immediately
    driveSyncNow();
  }).catch(function(e) {
    showSnack('Drive auth error: ' + e.message);
  });
}

// ── Sync all audio from Drive ────────────────────────────────────
function driveSyncNow() {
  if (!APP.driveConnected || !window._driveToken) {
    showSnack('Connect Google Drive first');
    return;
  }

  var syncEl = document.getElementById('drive-last-sync');
  if (syncEl) syncEl.textContent = 'Syncing…';
  showSnack('Scanning Google Drive…');

  var mimeQ = AUDIO_MIMES.map(function(m) { return "mimeType='" + m + "'"; }).join(' or ');
  var q     = '(' + mimeQ + ') and trashed=false';

  _driveListAll('/files', {
    q:        q,
    fields:   'nextPageToken,files(id,name,parents,mimeType)',
    pageSize: '1000',
    orderBy:  'name',
  }).then(function(files) {
    if (!files.length) {
      if (syncEl) syncEl.textContent = 'No audio in Drive';
      showSnack('No music found in Google Drive');
      return;
    }

    // Remove old Drive tracks, re-add fresh
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
    if (syncEl) syncEl.textContent = 'Sync failed';
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
    var p = Object.assign({}, params);
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
      if (data.nextPageToken) return page(data.nextPageToken);
      return all;
    });
  }
  return page('');
}

function _loadGSI() {
  return new Promise(function(resolve, reject) {
    if (window.google && window.google.accounts) { resolve(); return; }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload  = resolve;
    s.onerror = function() { reject(new Error('Failed to load Google Sign-In')); };
    document.head.appendChild(s);
  });
}

function _updateDriveSettingsUI() {
  var badge  = document.getElementById('drive-badge');
  var status = document.getElementById('drive-status-text');
  var syncRow= document.getElementById('drive-sync-row');
  var libSt  = document.getElementById('lc-drive-status');

  if (APP.driveConnected) {
    if (badge)  { badge.textContent = 'On'; badge.className = 'badge badge-on'; }
    if (status) status.textContent = APP.driveEmail || 'Connected';
    if (syncRow)syncRow.style.display = '';
    if (libSt)  libSt.textContent = 'Linked';
  } else {
    if (badge)  { badge.textContent = 'Off'; badge.className = 'badge badge-off'; }
    if (status) status.textContent = 'Not connected';
    if (syncRow)syncRow.style.display = 'none';
    if (libSt)  libSt.textContent = 'Not linked';
  }
}
