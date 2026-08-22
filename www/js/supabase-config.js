// ═══════════════════════════════════════════════════════════════════
// HMS — Supabase Configuration (Multi-Device Real-Time Sync)
// ═══════════════════════════════════════════════════════════════════
// SETUP (one-time, 5 minutes):
//   1. Create a project at https://supabase.com/dashboard (free tier).
//   2. Project Settings → API → note the Project URL and the
//      "publishable" (anon) key — paste into SUPABASE_CONFIG below.
//   3. Run supabase/setup.sql in the Supabase SQL Editor to create the
//      hms_store + hms_live_pops tables, RLS policies and enable
//      realtime publication.
//   4. (Optional) Realtime → hms_store & hms_live_pops must be listed
//      — setup.sql does this automatically.
// ═══════════════════════════════════════════════════════════════════

var SUPABASE_CONFIG = {
    url:           "https://hpjexrelsmdjkjgohele.supabase.co",
    publishableKey: "sb_publishable_LJTo5vD8aKXiW5rhBaUAtA_sZYWNa2K"
};

(function () {
    try {
        if (typeof supabase === 'undefined') {
            window.SB_DB = null;
            window.SB_CONFIGURED = false;
            return;
        }

        // Priority 1: Hash fragment — config shared from another device via "Share Link"
        // URL format: dashboard.html#sbcfg=BASE64_JSON
        try {
            var hash = window.location.hash || '';
            var m = hash.match(/[#&]sbcfg=([A-Za-z0-9+\/=%-]+)/);
            if (m) {
                var decoded = JSON.parse(atob(decodeURIComponent(m[1])));
                if (decoded && decoded.url && !decoded.url.startsWith('REPLACE_')) {
                    localStorage.setItem('hms_supabase_cfg', JSON.stringify(decoded));
                    try { history.replaceState(null, null, window.location.pathname + window.location.search); } catch (e2) {}
                    SUPABASE_CONFIG = decoded;
                }
            }
        } catch (e) {}

        // Priority 2: In-app saved config (from Data History setup form or downloaded file)
        if (SUPABASE_CONFIG.url.startsWith('REPLACE_')) {
            try {
                var _saved = JSON.parse(localStorage.getItem('hms_supabase_cfg') || 'null');
                if (_saved && _saved.url && !_saved.url.startsWith('REPLACE_')) {
                    SUPABASE_CONFIG = _saved;
                }
            } catch (e) {}
        }

        // If the URL is still a placeholder, run local-only
        if (SUPABASE_CONFIG.url.startsWith('REPLACE_')) {
            window.SB_DB = null;
            window.SB_CONFIGURED = false;
            console.info('[HMS] Supabase not configured — local-only mode. Use Admin → Data History to set up cloud sync.');
            return;
        }

        window.SB_DB = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
        window.SUPABASE = window.SB_DB; // alias
        window.SB_CONFIGURED = true;
        window.SB_URL = SUPABASE_CONFIG.url;
        window.HMS_SB_CFG = SUPABASE_CONFIG;  // exposed for Data History share/download
        console.info('[HMS] Supabase connected ✓ — multi-device cloud sync active.');
    } catch (e) {
        console.warn('[HMS] Supabase init failed:', e.message);
        window.SB_DB = null;
        window.SB_CONFIGURED = false;
    }
})();

// ═══════════════════════════════════════════════════════════════════
// Supabase error helpers
// ═══════════════════════════════════════════════════════════════════
// Returns true when the error is the classic "table not created yet" /
// "schema cache" PostgREST error, so the app can show a setup hint
// instead of raw SQL jargon.
window.isSupabaseSchemaMissing = function (err) {
    if (!err) return false;
    var m = (err.message || '').toLowerCase();
    var c = (err.code || '');
    return m.indexOf('could not find the table') !== -1
        || m.indexOf('schema cache') !== -1
        || m.indexOf('relationship') !== -1 && m.indexOf('between') !== -1
        || c === 'PGRST205'
        || c === '42P01';
};

// Friendly setup hint used when the schema/tables have not been created yet.
window.SB_SETUP_HINT = 'Cloud database is not set up yet. Run supabase/setup.sql in the Supabase Dashboard (SQL Editor) — see the README/instructions.';

// ═══════════════════════════════════════════════════════════════════
// Push notifications (background / app closed)
// ═══════════════════════════════════════════════════════════════════
// The app subscribes each device to Web Push using the VAPID public
// key below. When a live pop is inserted into hms_live_pops, a Supabase
// Database Webhook calls the push-relay Edge Function which delivers the
// message via Web Push (browser/desktop) and FCM (Android APK) even when
// the app is closed.
//
// To (re)generate the key pair run:
//   node -e "const c=require('crypto').createECDH('prime256v1');c.generateKeys();console.log(c.getPublicKey('base64','uncompressed'));console.log(c.getPrivateKey('base64'))"
// Public  → put below.
// Private → keep it in the Edge Function env var VAPID_PRIVATE_KEY
//           (Supabase Dashboard → Edge Functions → push-relay → Secrets),
//           NOT in this repo.
window.HMS_PUSH_CONFIG = {
    vapidPublicKey: "BA1kZgG9Rbo/CIkAC5wPTxTjg+D/utXfuwoH+ZD9spnqw0wHH6iXvrSnXfUhqenwGpEDncqzFujfyQtJ+dM2gm8=",
    relayUrl: "https://hpjexrelsmdjkjgohele.supabase.co/functions/v1/push-relay"
};

// Convert a base64url VAPID public key to a Uint8Array for PushManager.
// Falls back to base64 when the key doesn't use base64url padding.
window.urlBase64ToUint8Array = function (base64String) {
    try {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        var raw = atob(base64);
        var output = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
        return output;
    } catch (e) {
        console.warn('[HMS] urlBase64ToUint8Array failed:', e.message);
        return null;
    }
};

// ── WebSocket Notification Server URL ───────────────────────────────
// Dynamically resolves to current host IP/hostname when accessed over LAN/WAN
(function () {
    try {
        var customHost = localStorage.getItem('hms_ws_host') || localStorage.getItem('hms_ws_server_url');
        if (customHost) {
            window.WS_SERVER_URL = customHost.startsWith('ws') ? customHost : 'ws://' + customHost + ':8765';
            return;
        }
        var host = (window.location && window.location.hostname && window.location.hostname !== '' && window.location.hostname !== 'file:')
            ? window.location.hostname
            : 'localhost';
        var proto = (window.location && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
        window.WS_SERVER_URL = proto + '//' + host + ':8765';
    } catch (e) {
        window.WS_SERVER_URL = 'ws://localhost:8765';
    }
})();

// ═══════════════════════════════════════════════════════════════════
// Checklist Photo Upload & Image Compression Helper
// ═══════════════════════════════════════════════════════════════════

/**
 * Compresses an image File object using HTML Canvas.
 * @param {File} file - Source image file
 * @param {number} maxDim - Maximum width or height in pixels (default: 1200)
 * @param {number} quality - JPEG compression quality 0.0 - 1.0 (default: 0.8)
 * @returns {Promise<Blob>} JPEG Blob
 */
window.compressImageFile = function (file, maxDim, quality) {
    maxDim = maxDim || 1200;
    quality = quality || 0.8;
    return new Promise(function (resolve, reject) {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            return reject(new Error('Invalid image file'));
        }
        var reader = new FileReader();
        reader.onerror = function (err) { reject(err); };
        reader.onload = function (e) {
            var img = new Image();
            img.onerror = function (err) { reject(err); };
            img.onload = function () {
                var width = img.width;
                var height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(function (blob) {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas image compression failed'));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Reads a Blob/File as a Base64 Data URL.
 */
window.blobToDataURL = function (blob) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function (e) { resolve(e.target.result); };
        reader.readAsDataURL(blob);
    });
};

/**
 * Compresses and uploads a photo to Supabase Storage ('checklist-photos' bucket).
 * Falls back to Base64 Data URL if Supabase is unconfigured, offline, or bucket upload fails.
 * @param {File} file - Selected or captured photo file
 * @param {Object} [options] - { subfolder: string, filename: string }
 * @returns {Promise<{ url: string, name: string, uploadedAt: string, storage: 'supabase'|'local' }>}
 */
window.uploadChecklistPhoto = async function (file, options) {
    options = options || {};
    var subfolder = options.subfolder || 'checklists';
    var originalName = file.name || ('photo_' + Date.now() + '.jpg');
    
    // Step 1: Compress image client-side to max 1200px JPEG
    var compressedBlob;
    try {
        compressedBlob = await window.compressImageFile(file, 1200, 0.8);
    } catch (e) {
        console.warn('[HMS Photo] Compression failed, using raw file:', e.message);
        compressedBlob = file;
    }

    // Step 2: Try uploading to Supabase Storage if configured
    if (window.SB_CONFIGURED && window.SUPABASE && window.SUPABASE.storage) {
        try {
            var bucketName = 'checklist-photos';
            var fileExt = 'jpg';
            var fileName = (options.filename || ('img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7))) + '.' + fileExt;
            var filePath = subfolder + '/' + fileName;

            var uploadRes = await window.SUPABASE.storage
                .from(bucketName)
                .upload(filePath, compressedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (!uploadRes.error && uploadRes.data) {
                var publicRes = window.SUPABASE.storage.from(bucketName).getPublicUrl(filePath);
                var publicUrl = publicRes && publicRes.data && publicRes.data.publicUrl ? publicRes.data.publicUrl : null;
                if (publicUrl) {
                    return {
                        url: publicUrl,
                        name: originalName,
                        uploadedAt: new Date().toISOString(),
                        storage: 'supabase'
                    };
                }
            } else {
                console.warn('[HMS Photo] Supabase storage upload notice:', uploadRes.error ? uploadRes.error.message : 'No data');
            }
        } catch (err) {
            console.warn('[HMS Photo] Supabase upload failed, falling back to base64:', err.message);
        }
    }

    // Fallback: Base64 Data URL stored locally
    var dataUrl = await window.blobToDataURL(compressedBlob);
    return {
        url: dataUrl,
        name: originalName,
        uploadedAt: new Date().toISOString(),
        storage: 'local'
    };
};