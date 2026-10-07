// HMS — Multi-Device Sync via Supabase (PostgreSQL + Realtime)
// Falls back gracefully to localStorage-only (BroadcastChannel) when
// Supabase is not configured or unavailable.

var SYNC = (function () {
    // Only these keys are shared across devices — session/auth keys are excluded
    var SHARED_KEYS = [
        'users', 'departments', 'featureRights',
        'inventory', 'biomedical_inventory', 'biomedical_implants', 'biomedical_implantation_logs', 'biomedical_purchases', 'biomedical_meetings', 'biomedical_todos', 'biomedical_checklists', 'biomedical_checklist_logs', 'inventory_receipts', 'scraps', 'scrapConfig',
        'gatesecurity', 'doctorVisits', 'patientVisits', 'patients', 'phase2', 'phase2Tasks',
        'projects', 'ambulance', 'ambulance_trips',
        'problems', 'tasks', 'complaints',
        'roomchecklists', 'admissions', 'rooms', 'roomStatus',
        'lostfound', 'adminChecklist', 'adminAudits', 'checklists',
        'material_requests', 'suggestions', 'reports',
        'discountRequests',
        'roomCleaningTasks', 'floorItems', 'resetTokens', 'pwResetRequests', 'handovers',
        'hodTasks', 'hodRequests', 'hodPurchases',
        'hodTodos', 'hodUniforms', 'hodLockers',
        'hodEquipmentServices', 'hodEquipmentBackdowns',
        'hodLinenInv', 'hodHousekeepingInv', 'customLinenSizes', 'customUniformSizes',
        'employeeTodos',
        'budgets', 'budget_expenses',
        'quarterly_priorities',
        'inventory_movements', 'material_returns', 'sk_reports',
        'security_incidents', 'staffDeployment', 'securityDeployment', 'patientShiftings',
        'hospital_settings', 'hospitalUnits', 'hospitalFloors', 'floors',
        'checklistTemplates', 'checklistEntries', 'checklistAssignments',
        'dept_meetings', '_deleted_ids'
    ];

    var _pushing    = {};  // key -> true while a Supabase write is in-flight
    var _pending    = {};  // key -> latest data queued while a write is in-flight
    var _pushedKeys = {};  // key -> timestamp of last local push (per-key echo prevention)
    var _inited     = false;
    var _channel    = null;
    var _syncState  = 'synced'; // 'synced' | 'syncing' | 'offline'
    var _syncTimer  = null;

    function updateSyncBadge(state, customLabel) {
        if (state) _syncState = state;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            _syncState = 'offline';
        }
        var el = document.getElementById('dbSyncBadge');
        if (!el) return;

        el.className = 'db-sync-badge sync-' + _syncState;

        if (_syncState === 'syncing') {
            el.innerHTML = '<span class="sync-spinner"></span> ' + (customLabel || 'Syncing');
            el.setAttribute('title', 'Database sync in progress...');
        } else if (_syncState === 'offline') {
            el.innerHTML = '<span class="sync-dot sync-dot-offline"></span> ' + (customLabel || 'Offline');
            el.setAttribute('title', 'Offline: Local changes saved and will sync automatically when online.');
        } else {
            el.innerHTML = '<span class="sync-dot sync-dot-synced"></span> ' + (customLabel || 'Synced');
            var timeStr = (typeof SYNC !== 'undefined' && SYNC._lastSyncTs) ? (' (' + new Date(SYNC._lastSyncTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')') : '';
            el.setAttribute('title', 'Database is up to date' + timeStr + '. Click to refresh.');
        }
    }

    /* ── Cloud SQL (PostgreSQL Sync) ── */
    function cloudSqlPush(key, data) {
        if (typeof window === 'undefined' || !window.location || window.location.protocol === 'file:') return;
        if (SHARED_KEYS.indexOf(key) === -1) return;
        updateSyncBadge('syncing', 'Syncing');
        try {
            fetch('/api/db/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: key, data: data })
            }).then(function (res) {
                if (res.ok) {
                    clearTimeout(_syncTimer);
                    _syncTimer = setTimeout(function () { updateSyncBadge('synced', 'Synced'); }, 500);
                } else if (!navigator.onLine) {
                    updateSyncBadge('offline', 'Offline');
                }
            }).catch(function () {
                if (!navigator.onLine) updateSyncBadge('offline', 'Offline');
            });
        } catch (e) {}
    }

    function cloudSqlPull(cb) {
        if (typeof window === 'undefined' || !window.location || window.location.protocol === 'file:') {
            if (cb) cb(false);
            return;
        }
        updateSyncBadge('syncing', 'Syncing');
        fetch('/api/db/sync')
            .then(function (res) { return res.json(); })
            .then(function (json) {
                if (json && json.connected && Array.isArray(json.data) && json.data.length > 0) {
                    json.data.forEach(function (row) {
                        if (row && row.key && row.data !== undefined) {
                            var hadLocalOnly = _mergeIntoLocal(row.key, row.data);
                            if (hadLocalOnly) {
                                try {
                                    var merged = JSON.parse(localStorage.getItem('hms_' + row.key));
                                    cloudSqlPush(row.key, merged);
                                } catch (e) {}
                            }
                        }
                    });
                    _recordSyncTs();
                    clearTimeout(_syncTimer);
                    _syncTimer = setTimeout(function () { updateSyncBadge('synced', 'Synced'); }, 400);
                    if (cb) cb(true);
                } else {
                    clearTimeout(_syncTimer);
                    _syncTimer = setTimeout(function () { updateSyncBadge('synced', 'Synced'); }, 400);
                    if (cb) cb(false);
                }
            })
            .catch(function () {
                if (!navigator.onLine) {
                    updateSyncBadge('offline', 'Offline');
                } else {
                    updateSyncBadge('synced', 'Synced');
                }
                if (cb) cb(false);
            });
    }

    /* ── Queue-based push — never drops a write even when multiple saves fire quickly ── */
    function sbPush(key, data) {
        cloudSqlPush(key, data);
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

    function _getItemTs(item) {
        if (!item || typeof item !== 'object') return 0;
        var t = item.updatedAt || item.createdAt || item.timestamp || item.ts || item.date || item.updated_at || item.created_at || 0;
        if (typeof t === 'number') return t;
        if (typeof t === 'string') {
            var d = Date.parse(t);
            if (!isNaN(d)) return d;
        }
        return 0;
    }

    /* ── Merge remote data into local storage, preserving locally-created items ──
       For object arrays (items have an .id): newer timestamp wins, and local-only
       items are kept and scheduled to be pushed back.
       For anything else: local keys take precedence over remote keys.             */
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
                var cleanLocal = localData.filter(function(i) {
                    return !(i && i.id && deletedMap[i.id]);
                });
                var isObjArr = cleanRemote.some(function (i) { return i && typeof i === 'object' && i.id; }) ||
                               cleanLocal.some(function (i)  { return i && typeof i === 'object' && i.id; });
                if (isObjArr) {
                    var remoteMap = {};
                    cleanRemote.forEach(function (i) { if (i && i.id) remoteMap[i.id] = i; });
                    var localMap = {};
                    cleanLocal.forEach(function (i) { if (i && i.id) localMap[i.id] = i; });

                    var allIds = {};
                    Object.keys(remoteMap).forEach(function(id){ allIds[id] = true; });
                    Object.keys(localMap).forEach(function(id){ allIds[id] = true; });

                    merged = [];
                    Object.keys(allIds).forEach(function(id) {
                        if (deletedMap[id]) return;
                        var rItem = remoteMap[id];
                        var lItem = localMap[id];
                        if (rItem && lItem) {
                            var rTs = _getItemTs(rItem);
                            var lTs = _getItemTs(lItem);
                            if (lTs > rTs) {
                                merged.push(lItem);
                                hasLocalOnly = true; // Local is newer — schedule push
                            } else {
                                merged.push(rItem);
                            }
                        } else if (lItem) {
                            merged.push(lItem);
                            hasLocalOnly = true;
                        } else if (rItem) {
                            merged.push(rItem);
                        }
                    });
                } else {
                    merged = cleanRemote.slice();
                    cleanLocal.forEach(function(item) {
                        var k = typeof item === 'object' ? JSON.stringify(item) : String(item);
                        var existsInRemote = cleanRemote.some(function(ri) {
                            return (typeof ri === 'object' ? JSON.stringify(ri) : String(ri)) === k;
                        });
                        if (!existsInRemote) {
                            merged.push(item);
                            hasLocalOnly = true;
                        }
                    });
                }
            } else if (Array.isArray(remoteData)) {
                merged = remoteData.filter(function(i) {
                    return !(i && i.id && deletedMap[i.id]);
                });
            } else if (remoteData && typeof remoteData === 'object' && localData && typeof localData === 'object') {
                merged = Object.assign({}, remoteData, localData);
                Object.keys(localData).forEach(function(k) {
                    if (!remoteData.hasOwnProperty(k)) hasLocalOnly = true;
                });
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

    // Apply a single changed key from Realtime into localStorage safely preserving local entries
    function _applyLiveChange(key, data) {
        if (SHARED_KEYS.indexOf(key) === -1) return false;
        if (_pushedKeys[key] && Date.now() - _pushedKeys[key] < 2000) return false;
        try {
            var existing = localStorage.getItem('hms_' + key);
            var hadLocalOnly = _mergeIntoLocal(key, data);
            var updated = localStorage.getItem('hms_' + key);
            if (hadLocalOnly) {
                try {
                    var merged = JSON.parse(updated);
                    sbPush(key, merged);
                } catch (e) {}
            }
            return existing !== updated;
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
                        sbPullAll(function () {
                            _recordSyncTs();
                            try { if (typeof APP_SYNC !== 'undefined') APP_SYNC._updateStatus(); } catch (e) {}
                            try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                        });
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
        _pollInterval: null,
        _listenersAttached: false,
        _lastSyncTs: (function(){ try { return localStorage.getItem('hms_last_cloud_sync'); } catch(e){ return null; } })(),

        init: function () {
            if (_inited) return;
            _inited = true;

            hookDBSet();

            cloudSqlPull(function (pulled) {
                if (pulled) {
                    try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                }
            });

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

            // Periodic catch-up polling every 30 seconds to guarantee multi-device updates even if WS drops
            if (!this._pollInterval) {
                this._pollInterval = setInterval(function () {
                    cloudSqlPull();
                    if (window.SB_DB && document.visibilityState === 'visible') {
                        sbPullAll(function () { _recordSyncTs(); });
                    }
                }, 30000);
            }

            // Window Focus & Online re-sync listeners
            if (!this._listenersAttached) {
                this._listenersAttached = true;
                window.addEventListener('focus', function () {
                    cloudSqlPull();
                    if (window.SB_DB) {
                        sbPullAll(function () {
                            _recordSyncTs();
                            try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                        });
                    }
                });
                window.addEventListener('online', function () {
                    updateSyncBadge('syncing', 'Reconnecting...');
                    cloudSqlPull(function () {
                        updateSyncBadge('synced', 'Synced');
                    });
                    if (window.SB_DB) {
                        sbPullAll(function () {
                            _recordSyncTs();
                            try { if (typeof APP !== 'undefined') APP.refreshCurrent(); } catch (e) {}
                        });
                    }
                });
                window.addEventListener('offline', function () {
                    updateSyncBadge('offline', 'Offline');
                });
            }

            // Initial badge update
            updateSyncBadge();

            // Also wire up same-browser BroadcastChannel sync
            try { if (typeof APP_SYNC !== 'undefined') APP_SYNC.init(); } catch (e) {}
        },

        /* Push ALL current localStorage data to Cloud SQL / Supabase */
        pushAll: function () {
            updateSyncBadge('syncing', 'Syncing...');
            var items = [];
            SHARED_KEYS.forEach(function (key) {
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) {
                        var parsed = JSON.parse(raw);
                        sbPush(key, parsed);
                        items.push({ key: key, data: parsed });
                    }
                } catch (e) {}
            });
            if (items.length > 0) {
                fetch('/api/db/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: items })
                }).then(function () {
                    setTimeout(function () { updateSyncBadge('synced', 'Synced'); }, 500);
                }).catch(function () {
                    if (!navigator.onLine) updateSyncBadge('offline', 'Offline');
                });
            } else {
                setTimeout(function () { updateSyncBadge('synced', 'Synced'); }, 300);
            }
            _recordSyncTs();
            if (typeof APP !== 'undefined') APP.notify('All data synced to Cloud SQL (PostgreSQL)', 'success');
        },

        /* Pull ALL data from the cloud into localStorage right now */
        pullNow: function (cb) {
            updateSyncBadge('syncing', 'Syncing...');
            cloudSqlPull(function (ok) {
                if (window.SB_DB) {
                    sbPullAll(function () {
                        _recordSyncTs();
                        updateSyncBadge('synced', 'Synced');
                        if (typeof APP !== 'undefined') APP.notify('Data pulled from cloud database', 'success');
                        if (cb) cb(true);
                    });
                } else {
                    _recordSyncTs();
                    updateSyncBadge('synced', 'Synced');
                    if (typeof APP !== 'undefined') APP.notify(ok ? 'Data pulled from Cloud SQL PostgreSQL' : 'Local data is up to date', 'success');
                    if (cb) cb(ok);
                }
            });
        },

        /* Expose badge update function */
        updateBadge: function (state, label) {
            updateSyncBadge(state, label);
        },

        /* Push single key data to Cloud SQL / Supabase immediately */
        push: function (key, data) {
            sbPush(key, data);
        },
        pushKey: function (key, data) {
            sbPush(key, data);
        },
        pushNow: function (key, data) {
            if (key) {
                var payload = data !== undefined ? data : (typeof DB !== 'undefined' ? DB.get(key) : null);
                if (payload !== null && payload !== undefined) {
                    sbPush(key, payload);
                }
            } else {
                this.pushAll();
            }
        },

        /* Return current sync state ('synced' | 'syncing' | 'offline') */
        getSyncState: function () {
            return _syncState;
        },

        /* Return connection + last-sync status */
        status: function () {
            return {
                connected: !!window.SB_DB,
                state:     _syncState,
                projectId: window.SB_URL || null,
                lastSync:  this._lastSyncTs
            };
        }
    };
})();