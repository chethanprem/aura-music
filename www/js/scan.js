// ── LOCAL MUSIC SCANNER ──────────────────────────────────────────
// Uses Capacitor Filesystem to walk device storage directories.
// Works on internal storage + SD card.
// ─────────────────────────────────────────────────────────────────

var IS_NATIVE = false;
try {
  IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform());
} catch(e) {}

var AUDIO_EXTS = ['mp3','flac','wav','aac','ogg','m4a','opus','wma','aiff','ape'];

// Directories to scan on internal storage
var SCAN_DIRS = ['Music', 'Download', 'Downloads', 'Ringtones', 'Podcasts'];

// Common SD card mount points Android uses
var SD_ROOTS = [
  '/storage/sdcard1',
  '/storage/sdcard2',
  '/storage/extSdCard',
  '/storage/external_sd',
  '/storage/emulated/1',
  '/mnt/sdcard1',
  '/mnt/extSdCard',
];

function scanLocalMusic() {
  if (!IS_NATIVE) {
    showSnack('Install the APK on your phone to scan music');
    return;
  }

  var el = document.getElementById('lc-scan-status');
  if (el) el.textContent = 'Scanning…';
  showSnack('Scanning device for music…');

  // Run async but don't let it crash the UI
  _doScan().then(function(added) {
    var status = document.getElementById('lc-scan-status');
    if (status) status.textContent = 'Tap to rescan';
    if (added > 0) {
      saveTracks();
      renderLibrary();
      renderHome();
      showSnack('Found ' + added + ' song' + (added > 1 ? 's' : '') + ' \uD83C\uDFB5');
    } else {
      showSnack('No new music found');
    }
  }).catch(function(e) {
    console.error('Scan failed:', e);
    var status = document.getElementById('lc-scan-status');
    if (status) status.textContent = 'Scan failed — tap to retry';
    showSnack('Scan failed: ' + (e.message || String(e)));
  });
}

function _doScan() {
  return new Promise(function(resolve, reject) {
    var FS = null;
    try {
      FS = window.Capacitor.Plugins.Filesystem;
    } catch(e) {}

    if (!FS) { reject(new Error('Filesystem plugin not available')); return; }

    // Request permission first
    _requestStoragePermission().then(function(granted) {
      if (!granted) {
        reject(new Error('Storage permission denied. Go to Settings > Apps > Aura Music > Permissions and enable Storage.'));
        return;
      }

      var existingIds = {};
      APP.tracks.forEach(function(t) { existingIds[t.id] = true; });
      var found = [];

      // Build list of all paths to scan
      var paths = [];
      // Internal storage dirs
      SCAN_DIRS.forEach(function(d) { paths.push({ path: d, dir: 'ExternalStorage' }); });
      // SD card roots and their subdirs
      SD_ROOTS.forEach(function(root) {
        paths.push({ path: root, dir: 'ExternalStorage' });
        SCAN_DIRS.forEach(function(d) {
          paths.push({ path: root + '/' + d, dir: 'ExternalStorage' });
        });
      });

      // Walk all paths sequentially
      var i = 0;
      function next() {
        if (i >= paths.length) {
          // Deduplicate by id
          var seen = {};
          var deduped = [];
          found.forEach(function(t) {
            if (!seen[t.id] && !existingIds[t.id]) {
              seen[t.id] = true;
              deduped.push(t);
            }
          });
          APP.tracks = APP.tracks.concat(deduped);
          resolve(deduped.length);
          return;
        }
        var p = paths[i++];
        _walkDir(FS, p.path, p.dir, 0).then(function(batch) {
          found = found.concat(batch);
          next();
        }).catch(function() {
          next(); // skip unreadable dirs silently
        });
      }
      next();
    });
  });
}

function _requestStoragePermission() {
  return new Promise(function(resolve) {
    try {
      var Perms = window.Capacitor.Plugins.Permissions;
      if (!Perms) { resolve(true); return; }

      // Try Android 13+ permission first (READ_MEDIA_AUDIO)
      Perms.query({ name: 'read-media-audio' }).then(function(r) {
        if (r && r.state === 'granted') { resolve(true); return; }
        return Perms.request({ name: 'read-media-audio' });
      }).then(function(r) {
        if (r && r.state === 'granted') { resolve(true); return; }
        // Fallback: Android 12 and below (READ_EXTERNAL_STORAGE)
        return Perms.request({ name: 'read-external-storage' });
      }).then(function(r) {
        resolve(r && r.state === 'granted');
      }).catch(function() {
        resolve(true); // try anyway
      });
    } catch(e) {
      resolve(true); // try anyway
    }
  });
}

function _walkDir(FS, path, directory, depth) {
  if (depth > 3) return Promise.resolve([]);
  return FS.readdir({ path: path, directory: directory }).then(function(res) {
    var entries = res.files || [];
    var results = [];
    var promises = [];

    entries.forEach(function(entry) {
      var name = typeof entry === 'string' ? entry : (entry.name || '');
      if (!name) return;
      var fullPath = path + '/' + name;
      var isDir    = typeof entry === 'object' && entry.type === 'directory';
      var ext      = name.split('.').pop().toLowerCase();

      if (isDir && depth < 3) {
        promises.push(
          _walkDir(FS, fullPath, directory, depth + 1).then(function(sub) {
            results = results.concat(sub);
          }).catch(function(){})
        );
      } else if (AUDIO_EXTS.indexOf(ext) !== -1) {
        promises.push(
          FS.getUri({ path: fullPath, directory: directory }).then(function(r) {
            var url  = r.uri || ('file:///storage/emulated/0/' + fullPath);
            var bare = name.replace(/\.[^.]+$/, '');
            var title  = bare;
            var artist = 'Unknown Artist';
            // Parse "Artist - Title" from filename
            var m = bare.match(/^(.+?)\s*[-\u2013]\s*(.+)$/);
            if (m) { artist = m[1].trim(); title = m[2].trim(); }
            results.push({
              id:       url,
              title:    title,
              artist:   artist,
              album:    path.split('/').pop() || 'Unknown Album',
              url:      url,
              thumb:    null,
              duration: 0,
              genre:    '',
              source:   (path.indexOf('sdcard') !== -1 || path.indexOf('extSd') !== -1) ? 'sdcard' : 'local',
            });
          }).catch(function(){})
        );
      }
    });

    return Promise.all(promises).then(function() { return results; });
  });
}
