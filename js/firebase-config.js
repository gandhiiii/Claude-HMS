// ═══════════════════════════════════════════════════════════════════
// HMS — Firebase Configuration (Multi-Device Real-Time Sync)
// ═══════════════════════════════════════════════════════════════════
// HOW TO SET UP (one-time, 5 minutes):
//   1. Go to https://console.firebase.google.com/
//   2. Click "Add project" → give it a name → Continue
//   3. Disable Google Analytics → Create project
//   4. Click "Web" (</>) icon → Register app → copy firebaseConfig
//   5. Go to Build → Realtime Database → Create database
//      Choose "Start in test mode" → Enable
//   6. Use the in-app Cloud Sync Setup (Admin → Data History page)
//      OR: download a pre-filled firebase-config.js from Data History
//      OR: open the Share Link from another configured device
// ═══════════════════════════════════════════════════════════════════

var firebaseConfig = {
    apiKey:            "AIzaSyA09-NWMOu7nVTGlsdhpIFXAkA1RDeS43Q",
    authDomain:        "new-hms-1.firebaseapp.com",
    databaseURL:       "https://new-hms-1-default-rtdb.firebaseio.com",
    projectId:         "new-hms-1",
    storageBucket:     "new-hms-1.firebasestorage.app",
    messagingSenderId: "786874294020",
    appId:             "1:786874294020:web:2876ccaf6ff744ff5a7a51"
};

(function () {
    try {
        if (typeof firebase === 'undefined') {
            window.FB_DB = null;
            window.FB_CONFIGURED = false;
            return;
        }

        // Priority 1: Hash fragment — config shared from another device via "Share Link"
        // URL format: dashboard.html#fbcfg=BASE64_JSON
        try {
            var hash = window.location.hash || '';
            var m = hash.match(/[#&]fbcfg=([A-Za-z0-9+\/=%-]+)/);
            if (m) {
                var decoded = JSON.parse(atob(decodeURIComponent(m[1])));
                if (decoded && decoded.apiKey && !decoded.apiKey.startsWith('REPLACE_')) {
                    localStorage.setItem('hms_firebase_cfg', JSON.stringify(decoded));
                    try { history.replaceState(null, null, window.location.pathname + window.location.search); } catch (e2) {}
                    firebaseConfig = decoded;
                }
            }
        } catch (e) {}

        // Priority 2: In-app saved config (from Data History setup form or downloaded file)
        if (firebaseConfig.apiKey.startsWith('REPLACE_')) {
            try {
                var _saved = JSON.parse(localStorage.getItem('hms_firebase_cfg') || 'null');
                if (_saved && _saved.apiKey && !_saved.apiKey.startsWith('REPLACE_')) {
                    firebaseConfig = _saved;
                }
            } catch (e) {}
        }

        // If every field is still a placeholder, run local-only
        if (firebaseConfig.apiKey.startsWith('REPLACE_')) {
            window.FB_DB = null;
            window.FB_CONFIGURED = false;
            console.info('[HMS] Firebase not configured — local-only mode. Use Admin → Data History to set up cloud sync.');
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.FB_DB = firebase.database();
        window.FB_CONFIGURED = true;
        window.FB_PROJECT_ID = firebaseConfig.projectId;
        window.HMS_FB_CFG = firebaseConfig;  // exposed for Data History share/download
        console.info('[HMS] Firebase connected ✓ — multi-device cloud sync active.');
    } catch (e) {
        console.warn('[HMS] Firebase init failed:', e.message);
        window.FB_DB = null;
        window.FB_CONFIGURED = false;
    }
})();
