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