// ═══════════════════════════════════════════════════════════════════
// HMS — Firebase Configuration (Multi-Device Real-Time Sync)
// ═══════════════════════════════════════════════════════════════════
// SETUP STEPS (one-time, 5 minutes):
//   1. Go to https://console.firebase.google.com/
//   2. Click "Add project" → give it a name → Continue
//   3. Disable Google Analytics → Create project
//   4. Click "Web" (</>) icon to add a web app → Register app
//   5. Copy the firebaseConfig values below
//   6. Go to Build → Realtime Database → Create database
//      Choose "Start in test mode" → Enable
//   7. Replace EACH "REPLACE_WITH_..." value below with your real values
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
            return;
        }
        // If any value is still a placeholder, run in local-only mode
        var configured = !firebaseConfig.apiKey.startsWith('REPLACE_');
        if (!configured) {
            window.FB_DB = null;
            console.info('[HMS] Firebase not configured — local-only mode. Edit js/firebase-config.js to enable multi-device sync.');
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.FB_DB = firebase.database();
        console.info('[HMS] Firebase connected ✓ — multi-device sync active.');
    } catch (e) {
        console.warn('[HMS] Firebase init failed:', e.message);
        window.FB_DB = null;
    }
})();
