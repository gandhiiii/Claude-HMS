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
        'roomCleaningTasks', 'floorItems', 'resetTokens',
        'hodTasks', 'hodRequests'
    ];

    var _pushing     = {};  // key -> true while a Firebase write is in-flight
    var _pending     = {};  // key -> latest data queued while a write is in-flight
    var _lastWriteTs = 0;   // ms timestamp of most recent local write (loop prevention)
    var _inited      = false;

    /* ── Queue-based push — never drops a write even when multiple saves fire quickly ── */
    function fbPush(key, data) {
        if (!window.FB_DB) return;
        if (SHARED_KEYS.indexOf(key) === -1) return;
        _lastWriteTs = Date.now();
        _pending[key] = data;               // always store the latest value
        if (!_pushing[key]) _flush(key);
    }

    function _flush(key) {
        if (!(key in _pending)) return;
        var data = _pending[key];
        delete _pending[key];
        _pushing[key] = true;
        try {
            window.FB_DB.ref('hms/' + key).set(data, function () {
                _pushing[key] = false;
                if (key in _pending) _flush(key); // send next queued value
            });
        } catch (e) {
            _pushing[key] = false;
        }
    }

    /* ── Merge remote data into local storage, preserving locally-created items ──
       For object arrays (items have an .id): remote wins for shared ids,
       but local-only items are kept and scheduled to be pushed back to Firebase.
       For anything else: remote wins outright.                                  */
    function _mergeIntoLocal(key, remoteData) {
        try {
            var localRaw = localStorage.getItem('hms_' + key);
            var merged       = remoteData;
            var hasLocalOnly = false;

            if (localRaw) {
                var localData;
                try { localData = JSON.parse(localRaw); } catch (e) { localData = null; }

                if (Array.isArray(remoteData) && Array.isArray(localData)) {
                    // Only do id-based merge for arrays of objects that have an .id field
                    var isObjArr = remoteData.some(function (i) { return i && typeof i === 'object' && i.id; }) ||
                                   localData.some(function (i)  { return i && typeof i === 'object' && i.id; });
                    if (isObjArr) {
                        var remoteIds = {};
                        remoteData.forEach(function (i) { if (i && i.id) remoteIds[i.id] = true; });
                        merged = remoteData.slice();
                        localData.forEach(function (item) {
                            if (item && item.id && !remoteIds[item.id]) {
                                merged.push(item);
                                hasLocalOnly = true;
                            }
                        });
                    }
                }
            }

            var json = JSON.stringify(merged);
            localStorage.setItem('hms_' + key, json);
            sessionStorage.setItem('hms_' + key, json);
            return hasLocalOnly;
        } catch (e) {
            return false;
        }
    }

    /* ── Pull ALL shared keys from Firebase; merge to protect locally-created data ── */
    function fbPullAll(cb) {
        if (!window.FB_DB) { if (cb) cb(); return; }
        window.FB_DB.ref('hms').once('value').then(function (snap) {
            var remote = snap.val();
            if (remote) {
                Object.keys(remote).forEach(function (key) {
                    if (SHARED_KEYS.indexOf(key) === -1) return;
                    var hadLocalOnly = _mergeIntoLocal(key, remote[key]);
                    if (hadLocalOnly) {
                        // Push merged data back so Firebase gains the locally-created items too
                        try {
                            var merged = JSON.parse(localStorage.getItem('hms_' + key));
                            fbPush(key, merged);
                        } catch (e) {}
                    }
                });
            } else {
                // Firebase is empty — push everything local so it gets stored
                SHARED_KEYS.forEach(function (key) {
                    try {
                        var raw = localStorage.getItem('hms_' + key);
                        if (raw) {
                            var d = JSON.parse(raw);
                            var hasData = Array.isArray(d) ? d.length > 0 : !!d;
                            if (hasData) fbPush(key, d);
                        }
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
            // Ignore events that fire within 2 s of a local write — those are echoes of our own push
            if (Date.now() - _lastWriteTs < 2000) return;
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
                // Pull latest data first (with merge), THEN start listening for live changes
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
