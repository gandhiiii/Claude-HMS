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
//   6. OR: use the in-app Cloud Sync Setup (Data History page)
//      to paste your config — it saves without editing this file.
// ═══════════════════════════════════════════════════════════════════

var firebaseConfig = {
    apiKey:            "REPLACE_WITH_YOUR_API_KEY",
    authDomain:        "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL:       "REPLACE_WITH_YOUR_DATABASE_URL",
    projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
    storageBucket:     "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
    appId:             "REPLACE_WITH_YOUR_APP_ID"
};

(function () {
    try {
        if (typeof firebase === 'undefined') {
            window.FB_DB = null;
            window.FB_CONFIGURED = false;
            return;
        }

        // Allow in-app configuration — credentials saved via the Cloud Sync Setup page
        // override the placeholder values above without editing this file.
        try {
            var _saved = JSON.parse(localStorage.getItem('hms_firebase_cfg') || 'null');
            if (_saved && _saved.apiKey && !_saved.apiKey.startsWith('REPLACE_')) {
                firebaseConfig = _saved;
            }
        } catch (e) {}

        // If every field is still a placeholder, run local-only
        var configured = !firebaseConfig.apiKey.startsWith('REPLACE_');
        if (!configured) {
            window.FB_DB = null;
            window.FB_CONFIGURED = false;
            console.info('[HMS] Firebase not configured — local-only mode. Use the "Data History" page to set up cloud sync.');
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.FB_DB = firebase.database();
        window.FB_CONFIGURED = true;
        window.FB_PROJECT_ID = firebaseConfig.projectId;
        console.info('[HMS] Firebase connected ✓ — multi-device cloud sync active.');
    } catch (e) {
        console.warn('[HMS] Firebase init failed:', e.message);
        window.FB_DB = null;
        window.FB_CONFIGURED = false;
    }
})();
