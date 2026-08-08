// HMS — Multi-Device Sync via Supabase (PostgreSQL + Realtime)
// Falls back gracefully to localStorage-only (BroadcastChannel) when
// Supabase is not configured or unavailable.

var SYNC = (function () {
    // Only these keys are shared across devices — session/auth keys are excluded
    var SHARED_KEYS = [
        'users', 'departments', 'featureRights',
        'inventory', 'inventory_receipts', 'inventory_movements',
        'gatesecurity', 'doctorVisits', 'patientVisits', 'phase2Tasks',
        'projects', 'ambulance', 'ambulance_trips',
        'problems', 'tasks', 'complaints',
        'roomchecklists', 'admissions', 'rooms', 'roomStatus',
        'lostfound', 'adminChecklist', 'checklists',
        'material_requests', 'suggestions', 'reports',
        'roomCleaningTasks', 'floorItems', 'resetTokens', 'handovers',
        'hodTasks', 'hodRequests', 'hodPurchases',
        'hodTodos', 'hodUniforms', 'hodLockers',
        'hodEquipmentServices', 'hodEquipmentBackdowns',
        'hodLinenInv', 'hodHousekeepingInv',
        'employeeTodos',
        'budgets', 'budget_expenses',
        'quarterly_priorities', 'pwResetRequests',
        'material_returns', 'sk_reports',
        'security_incidents', 'staffDeployment', 'securityDeployment', 'patientShiftings', '_deleted_ids'
    ];

    var _pushing    = {};  // key -> true while a Supabase write is in-flight
    var _pending    = {};  // key -> latest data queued while a write is in-flight
    var _pushedKeys = {};  // key -> timestamp of last local push (per-key echo prevention)
    var _inited     = false;
    var _channel    = null;

    /* ── Queue-based push — never drops a write even when multiple saves fire quickly ── */
    function sbPush(key, data) {
        if (!window.SB_DB) return;
        if (SHARED_KEYS.indexOf(key) === -1) return;
        _pushedKeys[key] = Date.now();      // per-key echo prevention timestamp
        _pending[key] = data;               // always store the latest value
        if (!_pushing[key]) _flush(key);
    }

    function _flush(key) {
        if (!(key in _pending)) return;
        var data = _pending[key];
        delete _pending[key];
        _pushing[key] = true;
        try {
            window.SB_DB.from('hms_store').upsert({ key: key, data: data }, { onConflict: 'key' }).then(function (res) {
                _pushing[key] = false;
                if (res && res.error) {
                    console.warn('[HMS] Supabase upsert failed for ' + key + ':', res.error.message);
                }
                if (key in _pending) _flush(key); // send next queued value
            }).catch(function (e) {
                _pushing[key] = false;
                if (key in _pending) _flush(key);
            });
        } catch (e) {
            _pushing[key] = false;
        }
    }

    /* ── Merge remote data into local storage, preserving locally-created items ──
       For object arrays (items have an .id): remote wins for shared ids,
       but local-only items are kept and scheduled to be pushed back.
       For anything else: remote wins outright.                                  */
    function _mergeIntoLocal(key, remoteData) {
        try {
            var localRaw = localStorage.getItem('hms_' + key);
            var localData = null;
            if (localRaw) {
                try { localData = JSON.parse(localRaw); } catch(e) {}
            }

            if (key === '_deleted_ids') {
                var localDel = localData || {};
                var mergedDel = Object.assign({}, remoteData || {}, localDel);
                var jsonDel = JSON.stringify(mergedDel);
                localStorage.setItem('hms_' + key, jsonDel);
                sessionStorage.setItem('hms_' + key, jsonDel);
                localStorage.setItem('hms__deleted_ids', jsonDel);
                sessionStorage.setItem('hms__deleted_ids', jsonDel);
                return false;
            }

            var deletedMap = {};
            try {
                var delRaw = localStorage.getItem('hms__deleted_ids');
                if (delRaw) deletedMap = JSON.parse(delRaw);
            } catch(e) {}

            // If Supabase has null for this key, keep local data & schedule cloud upload
            if (remoteData === null || remoteData === undefined) {
                if (localData !== null && localData !== undefined) {
                    var hasData = Array.isArray(localData) ? localData.length > 0 : !!localData;
                    if (hasData) return true; // hasLocalOnly = true -> triggers sbPush
                }
                return false;
            }

            var merged = remoteData;
            var hasLocalOnly = false;

            if (Array.isArray(remoteData) && Array.isArray(localData)) {
                var cleanRemote = remoteData.filter(function(i) {
                    return !(i && i.id && deletedMap[i.id]);
                });
                var isObjArr = cleanRemote.some(function (i) { return i && typeof i === 'object' && i.id; }) ||
                               localData.some(function (i)  { return i && typeof i === 'object' && i.id; });
                if (isObjArr) {
                    var remoteIds = {};
                    cleanRemote.forEach(function (i) { if (i && i.id) remoteIds[i.id] = true; });
                    merged = cleanRemote.slice();
                    localData.forEach(function (item) {
                        if (item && item.id && !remoteIds[item.id] && !deletedMap[item.id]) {
                            merged.push(item);
                            hasLocalOnly = true;
                        }
                    });
                } else {
                    merged = cleanRemote;
                }
            } else if (Array.isArray(remoteData)) {
                merged = remoteData.filter(function(i) {
                    return !(i && i.id && deletedMap[i.id]);
                });
            } else if (remoteData && typeof remoteData === 'object' && localData && typeof localData === 'object') {
                merged = Object.assign({}, localData, remoteData);
            }

            var json = JSON.stringify(merged);
            localStorage.setItem('hms_' + key, json);
            sessionStorage.setItem('hms_' + key, json);
            return hasLocalOnly;
        } catch (e) {
            return false;
        }
    }

    // Convert a JSONB payload that leaked an object-array into a real array
    function _normalize(data) {
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            var ks = Object.keys(data);
            if (ks.length > 0 && ks.filter(function(k){ return /^\d+$/.test(k); }).length === ks.length) {
                return ks.map(function(k){ return data[k]; });
            }
        }
        return data;
    }

    /* ── Pull ALL shared keys from Supabase; merge to protect locally-created data ── */
    function sbPullAll(cb) {
        if (!window.SB_DB) { if (cb) cb(); return; }
        window.SB_DB.from('hms_store').select('key, data').then(function (res) {
            if (res.error) throw res.error;
            var remote = {};
            (res.data || []).forEach(function (row) {
                remote[row.key] = _normalize(row.data);
            });

            // Deletions MUST merge first, otherwise stale local copies of
            // deleted records get re-added as "local-only" and re-pushed.
            Object.keys(remote).sort(function (a, b) {
                if (a === '_deleted_ids') return -1;
                if (b === '_deleted_ids') return 1;
                return 0;
            }).forEach(function (key) {
                if (SHARED_KEYS.indexOf(key) === -1) return;
                var hadLocalOnly = _mergeIntoLocal(key, remote[key]);
                if (hadLocalOnly) {
                    try {
                        var merged = JSON.parse(localStorage.getItem('hms_' + key));
                        sbPush(key, merged);
                    } catch (e) {}
                }
            });

            // Push local keys that Supabase doesn't have yet
            var _pushedCount = 0;
            SHARED_KEYS.forEach(function (key) {
                if (remote.hasOwnProperty(key)) return; // already handled above
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) {
                        var d = JSON.parse(raw);
                        var hasData = Array.isArray(d) ? d.length > 0 : !!d;
                        if (hasData) { sbPush(key, d); _pushedCount++; }
                    }
                } catch (e) {}
            });
            if (_pushedCount > 0) {
                setTimeout(function () {
                    try { if (typeof APP !== 'undefined') APP.notify('Data uploaded to cloud database ✓', 'success'); } catch (e) {}
                }, 1500);
            }

            if (cb) cb();
        }).catch(function (e) {
            if (window.isSupabaseSchemaMissing && window.isSupabaseSchemaMissing(e)) {
                console.warn('[HMS] Supabase tables missing — run supabase/setup.sql in the Supabase SQL Editor.');
                if (cb) cb();
                return;
            }
            console.warn('[HMS] Supabase pull error:', (e && e.message) || e);
            if (cb) cb();
        });
    }

    // Apply a single changed key from Realtime into localStorage
    function _applyLiveChange(key, data) {
        if (SHARED_KEYS.indexOf(key) === -1) return false;
        if (_pushedKeys[key] && Date.now() - _pushedKeys[key] < 2000) return false;
        try {
            var delMap = null;
            try {
                var delRaw = localStorage.getItem('hms__deleted_ids');
                if (delRaw) delMap = JSON.parse(delRaw);
            } catch (e2) {}
            if (Array.isArray(data) && delMap) {
                data = data.filter(function (i) { return !(i && i.id && delMap[i.id]); });
            }
            var json = JSON.stringify(data);
            var existing = localStorage.getItem('hms_' + key);
            if (existing !== json) {
                localStorage.setItem('hms_' + key, json);
                sessionStorage.setItem('hms_' + key, json);
                return true;
            }
        } catch (e) {}
        return false;
    }

    /* ── Listen for real-time changes from OTHER devices (postgres_changes) ── */
    function sbListen() {
        if (!window.SB_DB || _channel) return;
        try {
            _channel = window.SB_DB
                .channel('hms-store-realtime')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'hms_store' },
                    function (payload) {
                        var changed = false;
                        // Deletions must be applied before writes
                        if (payload.eventType === 'DELETE') {
                            var dk = payload.old && payload.old.key;
                            if (dk && SHARED_KEYS.indexOf(dk) !== -1) {
                                try { localStorage.removeItem('hms_' + dk); sessionStorage.removeItem('hms_' + dk); } catch (e2) {}
                                changed = true;
                            }
                        } else {
                            var newRow = payload.new || {};
                            if (newRow.key === '_deleted_ids') {
                                _applyLiveChange('_deleted_ids', newRow.data);
                            }
                            if (newRow.key) {
                                changed = _applyLiveChange(newRow.key, _normalize(newRow.data)) || changed;
                            }
                        }
                        if (changed) {
                            try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._flash(); } catch (e) {}
                            clearTimeout(SYNC._refreshTimer);
                            SYNC._refreshTimer = setTimeout(function () {
                                try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                            }, 300);
                        }
                    })
                .subscribe(function (status) {
                    if (status === 'SUBSCRIBED') {
                        try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._updateStatus(); } catch (e) {}
                    }
                });
        } catch (e) {
            console.warn('[HMS] Supabase realtime subscribe error:', e.message);
        }
    }

    /* ── Intercept DB.set so every local write also goes to Supabase ── */
    function hookDBSet() {
        if (typeof DB === 'undefined') return;
        var _orig = DB.set.bind(DB);
        DB.set = function (key, data) {
            _orig(key, data);
            sbPush(key, data);
        };
    }

    function _recordSyncTs() {
        var ts = new Date().toISOString();
        try { localStorage.setItem('hms_last_cloud_sync', ts); } catch (e) {}
        SYNC._lastSyncTs = ts;
        try {
            var el = document.getElementById('cloudSyncTs');
            if (el) el.textContent = 'Last sync: ' + new Date(ts).toLocaleTimeString();
        } catch (e) {}
    }

    return {
        _refreshTimer: null,
        _lastSyncTs: (function(){ try { return localStorage.getItem('hms_last_cloud_sync'); } catch(e){ return null; } })(),

        init: function () {
            if (_inited) return;
            _inited = true;

            hookDBSet();

            if (window.SB_DB) {
                // Pull latest data first (with merge), THEN start listening for live changes
                sbPullAll(function () {
                    _recordSyncTs();
                    sbListen();
                    try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._updateStatus(); } catch (e) {}
                    try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                });
            } else {
                try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._updateStatus(); } catch (e) {}
            }

            // Also wire up same-browser BroadcastChannel sync
            try { if (typeof APP_SYNC !== 'undefined') APP_SYNC.init(); } catch (e) {}
        },

        /* Push ALL current localStorage data to Supabase */
        pushAll: function () {
            if (!window.SB_DB) { if (typeof APP !== 'undefined') APP.notify('Cloud database not configured', 'error'); return; }
            SHARED_KEYS.forEach(function (key) {
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) sbPush(key, JSON.parse(raw));
                } catch (e) {}
            });
            _recordSyncTs();
            if (typeof APP !== 'undefined') APP.notify('All data pushed to cloud', 'success');
        },

        /* Pull ALL data from the cloud into localStorage right now */
        pullNow: function (cb) {
            if (!window.SB_DB) {
                if (typeof APP !== 'undefined') APP.notify('Cloud database not configured', 'error');
                if (cb) cb(false);
                return;
            }
            sbPullAll(function () {
                _recordSyncTs();
                if (typeof APP !== 'undefined') APP.notify('Data pulled from cloud', 'success');
                if (cb) cb(true);
            });
        },

        /* Return connection + last-sync status */
        status: function () {
            return {
                connected: !!window.SB_DB,
                projectId: window.SB_URL || null,
                lastSync:  this._lastSyncTs
            };
        }
    };
})();