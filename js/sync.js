// HMS — Multi-Device Sync via Firebase Realtime Database
// Falls back gracefully to localStorage-only (BroadcastChannel) when
// Firebase is not configured or unavailable.

var SYNC = (function () {
    // Only these keys are shared across devices — session/auth keys are excluded
    var SHARED_KEYS = [
        'users', 'departments', 'featureRights',
        'inventory', 'inventory_receipts',
        'gatesecurity', 'phase2Tasks',
        'projects', 'ambulance', 'ambulance_trips',
        'problems', 'tasks', 'complaints',
        'roomchecklists', 'admissions', 'rooms', 'roomStatus',
        'lostfound', 'adminChecklist', 'checklists',
        'material_requests', 'suggestions', 'reports',
        'roomCleaningTasks', 'floorItems', 'resetTokens'
    ];

    var _pushing = false;   // prevents write→listen→write loops
    var _inited  = false;

    /* ── Push one key to Firebase ── */
    function fbPush(key, data) {
        if (!window.FB_DB || _pushing) return;
        if (SHARED_KEYS.indexOf(key) === -1) return;
        try {
            _pushing = true;
            window.FB_DB.ref('hms/' + key).set(data, function () { _pushing = false; });
        } catch (e) { _pushing = false; }
    }

    /* ── Pull ALL shared keys from Firebase into localStorage ── */
    function fbPullAll(cb) {
        if (!window.FB_DB) { if (cb) cb(); return; }
        window.FB_DB.ref('hms').once('value').then(function (snap) {
            var remote = snap.val();
            if (remote) {
                Object.keys(remote).forEach(function (key) {
                    if (SHARED_KEYS.indexOf(key) === -1) return;
                    try {
                        var json = JSON.stringify(remote[key]);
                        localStorage.setItem('hms_' + key, json);
                        sessionStorage.setItem('hms_' + key, json);
                    } catch (e) {}
                });
            }
            if (cb) cb();
        }).catch(function (e) {
            console.warn('[HMS] Firebase pull error:', e.message);
            if (cb) cb();
        });
    }

    /* ── Listen for real-time changes from OTHER devices ── */
    function fbListen() {
        if (!window.FB_DB) return;
        window.FB_DB.ref('hms').on('value', function (snap) {
            if (_pushing) return;            // this device just wrote — skip
            var remote = snap.val();
            if (!remote) return;
            var changed = false;
            Object.keys(remote).forEach(function (key) {
                if (SHARED_KEYS.indexOf(key) === -1) return;
                try {
                    var json = JSON.stringify(remote[key]);
                    var existing = localStorage.getItem('hms_' + key);
                    if (existing !== json) {
                        localStorage.setItem('hms_' + key, json);
                        sessionStorage.setItem('hms_' + key, json);
                        changed = true;
                    }
                } catch (e) {}
            });
            if (changed) {
                try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._flash(); } catch (e) {}
                // Debounce refresh so rapid updates don't flicker
                clearTimeout(SYNC._refreshTimer);
                SYNC._refreshTimer = setTimeout(function () {
                    try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                }, 300);
            }
        });
    }

    /* ── Intercept DB.set so every local write also goes to Firebase ── */
    function hookDBSet() {
        if (typeof DB === 'undefined') return;
        var _orig = DB.set.bind(DB);
        DB.set = function (key, data) {
            _orig(key, data);
            fbPush(key, data);
        };
    }

    return {
        _refreshTimer: null,

        init: function () {
            if (_inited) return;
            _inited = true;

            hookDBSet();

            if (window.FB_DB) {
                // Pull latest data first, THEN start listening for live changes
                fbPullAll(function () {
                    fbListen();
                    try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                });
            }

            // Also wire up same-browser BroadcastChannel sync
            try { if (typeof APP_SYNC !== 'undefined') APP_SYNC.init(); } catch (e) {}
        },

        /* Push ALL current localStorage data to Firebase (first-time migration) */
        pushAll: function () {
            if (!window.FB_DB) { console.warn('[HMS] Firebase not configured'); return; }
            SHARED_KEYS.forEach(function (key) {
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) {
                        var data = JSON.parse(raw);
                        fbPush(key, data);
                    }
                } catch (e) {}
            });
            console.info('[HMS] Pushed all local data to Firebase.');
        }
    };
})();
