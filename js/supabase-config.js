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