// ── FOLDER PICKER MUSIC LOADER ───────────────────────────────────
// Uses Android SAF (Storage Access Framework) via Capacitor
// Filesystem.pickDirectory — lets user select ANY folder including
// SD card, WhatsApp, Downloads etc. No permission guessing needed.
// Falls back to a predefined path list if picker unavailable.
// ─────────────────────────────────────────────────────────────────

var IS_NATIVE = false;
try { IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform()); } catch(e) {}

var AUDIO_EXTS = ['mp3','flac','wav','aac','ogg','m4a','opus','wma','aiff','ape'];

// ── PUBLIC: called from UI ────────────────────────────────────────
function scanLocalMusic() {
  if (!IS_NATIVE) {
    showSnack('Install the APK on your phone to pick folders');
    return;
  }

  var FS = null;
  try { FS = window.Capacitor.Plugins.Filesystem; } catch(e) {}
  if (!FS) { showSnack('Filesystem plugin not available'); return; }

  _updateScanStatus('Picking folder…');

  // Try SAF folder picker first (Android 5+)
  if (FS.pickDirectory) {
    FS.pickDirectory().then(function(res) {
      var uri = res && (res.uri || res.path);
      if (!uri) { _updateScanStatus('No folder selected'); return; }
      _updateScanStatus('Reading folder…');
      _readPickedFolder(FS, uri);
    }).catch(function(e) {
      // Picker cancelled or unavailable — fall back to path list
      console.warn('pickDirectory failed, using path fallback:', e.message);
      _fallbackScan(FS);
    });
  } else {
    // Older Capacitor build without pickDirectory
    _fallbackScan(FS);
  }
}

// ── READ A SAF-PICKED FOLDER URI ──────────────────────────────────
function _readPickedFolder(FS, uri) {
  // Use readdir with the SAF URI directly
  FS.readdir({ path: uri }).then(function(res) {
    var entries = res.files || [];
    var tracks  = [];
    var pending = 0;

    if (!entries.length) {
      _updateScanStatus('Tap to pick folder');
      showSnack('Folder is empty');
      return;
    }

    entries.forEach(function(entry) {
      var name = typeof entry === 'string' ? entry : (entry.name || '');
      if (!name) return;
      var ext = name.split('.').pop().toLowerCase();
      if (AUDIO_EXTS.indexOf(ext) === -1) return;

      pending++;
      var fullUri = uri.endsWith('/') ? uri + name : uri + '/' + name;

      // Try to get a playable URI
      FS.getUri({ path: fullUri }).then(function(r) {
        var url = r.uri || fullUri;
        tracks.push(_makeTrack(name, url, 'local'));
        pending--;
        if (pending === 0) _finishScan(tracks);
      }).catch(function() {
        // Use URI as-is
        tracks.push(_makeTrack(name, fullUri, 'local'));
        pending--;
        if (pending === 0) _finishScan(tracks);
      });
    });

    if (pending === 0) _finishScan(tracks);

  }).catch(function(e) {
    console.warn('readdir failed:', e);
    _updateScanStatus('Tap to pick folder');
    showSnack('Could not read folder: ' + (e.message || String(e)));
  });
}

// ── FALLBACK: Walk known paths when SAF picker unavailable ────────
var FALLBACK_PATHS = [
  { path: 'Music',     dir: 'ExternalStorage' },
  { path: 'Download',  dir: 'ExternalStorage' },
  { path: 'Downloads', dir: 'ExternalStorage' },
  { path: 'Music',     dir: 'Documents' },
];

function _fallbackScan(FS) {
  showSnack('Scanning common music folders…');
  var all     = [];
  var i       = 0;

  function next() {
    if (i >= FALLBACK_PATHS.length) {
      _finishScan(all);
      return;
    }
    var p = FALLBACK_PATHS[i++];
    _walkDir(FS, p.path, p.dir, 0).then(function(batch) {
      all = all.concat(batch);
      next();
    }).catch(function() { next(); });
  }
  next();
}

// ── RECURSIVE DIR WALKER ──────────────────────────────────────────
function _walkDir(FS, path, directory, depth) {
  if (depth > 3) return Promise.resolve([]);
  return FS.readdir({ path: path, directory: directory }).then(function(res) {
    var entries  = res.files || [];
    var results  = [];
    var promises = [];

    entries.forEach(function(entry) {
      var name    = typeof entry === 'string' ? entry : (entry.name || '');
      if (!name) return;
      var fullPath = path + '/' + name;
      var isDir   = typeof entry === 'object' && entry.type === 'directory';
      var ext     = name.split('.').pop().toLowerCase();

      if (isDir && depth < 3) {
        promises.push(
          _walkDir(FS, fullPath, directory, depth + 1)
            .then(function(sub) { results = results.concat(sub); })
            .catch(function(){})
        );
      } else if (AUDIO_EXTS.indexOf(ext) !== -1) {
        promises.push(
          FS.getUri({ path: fullPath, directory: directory })
            .then(function(r) {
              results.push(_makeTrack(name, r.uri || fullPath, 'local'));
            }).catch(function(){})
        );
      }
    });

    return Promise.all(promises).then(function() { return results; });
  });
}

// ── HELPERS ───────────────────────────────────────────────────────
function _makeTrack(filename, url, source) {
  var bare   = filename.replace(/\.[^.]+$/, '');
  var title  = bare;
  var artist = 'Unknown Artist';
  var m = bare.match(/^(.+?)\s*[-\u2013]\s*(.+)$/);
  if (m) { artist = m[1].trim(); title = m[2].trim(); }
  return {
    id:       url,
    title:    title,
    artist:   artist,
    album:    'Unknown Album',
    url:      url,
    thumb:    null,
    duration: 0,
    genre:    '',
    source:   source,
  };
}

function _finishScan(tracks) {
  // Deduplicate against existing library
  var existingIds = {};
  APP.tracks.forEach(function(t) { existingIds[t.id] = true; });
  var newTracks = tracks.filter(function(t) { return !existingIds[t.id]; });

  APP.tracks = APP.tracks.concat(newTracks);

  if (newTracks.length) {
    saveTracks();
    renderLibrary();
    renderHome();
    showSnack('Added ' + newTracks.length + ' song' + (newTracks.length > 1 ? 's' : '') + ' \uD83C\uDFB5');
  } else {
    showSnack('No new audio files found in folder');
  }
  _updateScanStatus('Tap to pick folder');
}

function _updateScanStatus(msg) {
  var el = document.getElementById('lc-scan-status');
  if (el) el.textContent = msg;
}
