// HMS — WebSocket Push Notification Layer
// Connects to a WebSocket server if window.WS_SERVER_URL is defined.
// Also hooks localStorage writes (from Firebase real-time sync) to detect
// newly created items and show in-app + browser push notifications.
// Does NOT change any existing module — add-only.

var WS_NOTIFY = (function () {

    /* ── Config ── */
    var WS_URL       = window.WS_SERVER_URL || null;   // set in firebase-config.js or inline
    var RECONNECT_MS = 5000;

    /* ── Keys to watch for new items ── */
    var WATCHED_KEYS = [
        'tasks', 'complaints', 'problems',
        'material_requests', 'hodRequests', 'suggestions',
        'ambulance', 'admissions', 'lostfound'
    ];

    /* ── State ── */
    var _ws           = null;
    var _notifications = [];   // [{title,body,time,read}]
    var _unread        = 0;
    var _seenIds       = {};   // key -> [id, ...]
    var _inited        = false;
    var _origLSSet     = null; // original localStorage.setItem

    /* ────────────────────────────────────────────────────────────
       Persistence of seen IDs (so page reload doesn't re-notify)
    ──────────────────────────────────────────────────────────── */
    function _loadSeen() {
        try {
            var raw = localStorage.getItem('hms_ws_seen_ids');
            if (raw) _seenIds = JSON.parse(raw);
        } catch (e) {}
    }

    function _saveSeen() {
        try { localStorage.setItem('hms_ws_seen_ids', JSON.stringify(_seenIds)); } catch (e) {}
    }

    /* ── Seed seen IDs from current local data (no notifications for existing items) ── */
    function _seedSeen() {
        WATCHED_KEYS.forEach(function (key) {
            try {
                var raw = localStorage.getItem('hms_' + key);
                if (!raw) return;
                var data = JSON.parse(raw);
                if (!Array.isArray(data)) return;
                if (!_seenIds[key]) _seenIds[key] = [];
                data.forEach(function (item) {
                    if (item && item.id && _seenIds[key].indexOf(item.id) === -1) {
                        _seenIds[key].push(item.id);
                    }
                });
            } catch (e) {}
        });
        _saveSeen();
    }

    /* ────────────────────────────────────────────────────────────
       Relevance + message helpers
    ──────────────────────────────────────────────────────────── */
    function _getUser() {
        try { return (typeof AUTH !== 'undefined') ? AUTH.currentUser() : null; } catch (e) { return null; }
    }

    function _isRelevant(key, item, user) {
        if (!user) return false;
        if (user.role === 'admin' || user.isSuperAdmin) return true;
        if (key === 'tasks')            return item.assignedTo === user.username || item.createdBy === user.username;
        if (key === 'complaints')       return item.department === user.department;
        if (key === 'problems')         return item.department === user.department;
        if (key === 'material_requests') return item.requestedBy === user.username || item.department === user.department;
        if (key === 'hodRequests')      return item.hodId === user.id || item.assignedTo === user.username;
        if (key === 'suggestions')      return user.role === 'hod';
        if (key === 'ambulance')        return true;
        if (key === 'admissions')       return true;
        if (key === 'lostfound')        return true;
        return false;
    }

    function _getMessage(key, item) {
        var map = {
            tasks:             { icon: '📋', title: 'New Task',           body: item.title || item.description || 'Task assigned to you' },
            complaints:        { icon: '📝', title: 'New Complaint',       body: item.subject || item.description || 'Complaint filed' },
            problems:          { icon: '🔧', title: 'New Problem',         body: item.title || item.description || 'Problem reported' },
            material_requests: { icon: '📦', title: 'Material Request',    body: item.itemName || item.description || 'New request submitted' },
            hodRequests:       { icon: '👔', title: 'HOD Request',         body: item.title || item.subject || 'New HOD request' },
            suggestions:       { icon: '💡', title: 'New Suggestion',      body: item.subject || item.text || 'Suggestion received' },
            ambulance:         { icon: '🚑', title: 'Ambulance Alert',     body: item.patientName || item.destination || 'Ambulance call' },
            admissions:        { icon: '🏥', title: 'New Admission',       body: item.patientName || 'Patient admitted' },
            lostfound:         { icon: '🔍', title: 'Lost & Found',        body: item.itemName || item.description || 'Item reported' }
        };
        var m = map[key] || { icon: '🔔', title: 'Update', body: 'New data received' };
        return { title: m.icon + ' ' + m.title, body: m.body };
    }

    /* ────────────────────────────────────────────────────────────
       Detect new items in a key's data array
    ──────────────────────────────────────────────────────────── */
    function _checkForNew(key, data) {
        if (!Array.isArray(data)) return;
        var user = _getUser();
        if (!_seenIds[key]) _seenIds[key] = [];

        var changed = false;
        data.forEach(function (item) {
            if (!item || !item.id) return;
            if (_seenIds[key].indexOf(item.id) !== -1) return; // already seen
            _seenIds[key].push(item.id);
            changed = true;
            if (_isRelevant(key, item, user)) {
                var msg = _getMessage(key, item);
                _push(msg.title, msg.body, 'info');
            }
        });

        if (changed) _saveSeen();
    }

    /* ────────────────────────────────────────────────────────────
       Hook localStorage.setItem to intercept Firebase sync writes
    ──────────────────────────────────────────────────────────── */
    function _hookLocalStorage() {
        _origLSSet = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (k, v) {
            _origLSSet(k, v);
            // Skip our own seen-IDs key to avoid recursion
            if (k === 'hms_ws_seen_ids') return;
            WATCHED_KEYS.forEach(function (key) {
                if (k === 'hms_' + key) {
                    try { _checkForNew(key, JSON.parse(v)); } catch (e) {}
                }
            });
        };
    }

    /* ────────────────────────────────────────────────────────────
       Browser push notification (only when tab is not focused)
    ──────────────────────────────────────────────────────────── */
    function _requestPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(function () {});
        }
    }

    function _browserNotify(title, body) {
        if (!('Notification' in window)) return;
        if (document.hasFocus()) return;
        if (Notification.permission !== 'granted') return;
        try {
            new Notification(title, {
                body: body,
                icon: 'assets/stavya-logo.png',
                badge: 'assets/stavya-logo.png',
                tag: 'hms-notify'
            });
        } catch (e) {}
    }

    /* ────────────────────────────────────────────────────────────
       Core push — adds to list, updates bell, shows toast + browser notif
    ──────────────────────────────────────────────────────────── */
    function _push(title, body, type) {
        _notifications.unshift({ title: title, body: body, type: type || 'info', time: Date.now(), read: false });
        if (_notifications.length > 60) _notifications.pop();
        _unread++;
        _updateBell();
        _browserNotify(title, body);
        // Reuse existing APP.notify toast
        try {
            if (typeof APP !== 'undefined') APP.notify(title + ': ' + body, type || 'info');
        } catch (e) {}
    }

    /* ────────────────────────────────────────────────────────────
       Bell button UI (injected into #mainHeader by renderHeader)
    ──────────────────────────────────────────────────────────── */
    function _updateBell() {
        var badge = document.getElementById('wsBellBadge');
        if (!badge) return;
        badge.textContent = _unread > 99 ? '99+' : String(_unread);
        badge.style.display = _unread > 0 ? 'flex' : 'none';
    }

    /* ── Notification panel dropdown ── */
    function _showPanel() {
        var existing = document.getElementById('wsNotifPanel');
        if (existing) { existing.remove(); return; }

        var panel = document.createElement('div');
        panel.id = 'wsNotifPanel';
        panel.style.cssText = [
            'position:fixed',
            'top:58px',
            'right:12px',
            'width:310px',
            'max-height:420px',
            'overflow-y:auto',
            'background:var(--white, #fff)',
            'border:1px solid var(--border, #e0e0e0)',
            'border-radius:var(--radius, 8px)',
            'box-shadow:0 8px 28px rgba(0,0,0,0.18)',
            'z-index:10000',
            'font-family:inherit'
        ].join(';');

        var items = _notifications.length === 0
            ? '<div style="padding:28px 16px;text-align:center;color:#888;font-size:13px;">No notifications yet</div>'
            : _notifications.map(function (n) {
                var ago = _timeAgo(n.time);
                var bg  = n.read ? 'transparent' : 'rgba(66,133,244,0.06)';
                return '<div style="padding:10px 14px;border-bottom:1px solid var(--light-gray,#f0f0f0);background:' + bg + '">'
                    + '<div style="font-size:13px;font-weight:600;color:var(--text,#222);">' + _esc(n.title) + '</div>'
                    + '<div style="font-size:12px;color:var(--gray,#666);margin-top:2px;">' + _esc(n.body) + '</div>'
                    + '<div style="font-size:11px;color:#aaa;margin-top:4px;">' + ago + '</div>'
                    + '</div>';
            }).join('');

        panel.innerHTML =
            '<div style="padding:10px 14px;border-bottom:1px solid var(--border,#e0e0e0);display:flex;justify-content:space-between;align-items:center;">'
          +   '<span style="font-weight:700;font-size:14px;">🔔 Notifications</span>'
          +   '<button onclick="WS_NOTIFY.clearAll()" style="border:none;background:none;cursor:pointer;font-size:11px;color:#999;padding:2px 6px;">Clear all</button>'
          + '</div>'
          + items;

        document.body.appendChild(panel);

        // Mark all as read
        _notifications.forEach(function (n) { n.read = true; });
        _unread = 0;
        _updateBell();

        // Close on outside click
        setTimeout(function () {
            document.addEventListener('click', function _close(e) {
                var p = document.getElementById('wsNotifPanel');
                var b = document.getElementById('wsBellBtn');
                if (p && !p.contains(e.target) && e.target !== b && !b.contains(e.target)) {
                    p.remove();
                    document.removeEventListener('click', _close);
                }
            });
        }, 80);
    }

    function _timeAgo(ts) {
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60)   return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return new Date(ts).toLocaleDateString();
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    /* ────────────────────────────────────────────────────────────
       WebSocket connection (optional — needs WS_SERVER_URL)
    ──────────────────────────────────────────────────────────── */
    function _connectWS() {
        if (!WS_URL) return; // silently skip if no server configured
        try {
            _ws = new WebSocket(WS_URL);

            _ws.onopen = function () {
                console.log('[WS_NOTIFY] Connected →', WS_URL);
                var user = _getUser();
                if (user && _ws.readyState === WebSocket.OPEN) {
                    _ws.send(JSON.stringify({
                        type:   'auth',
                        userId: user.id,
                        role:   user.role,
                        dept:   user.department || null
                    }));
                }
            };

            _ws.onmessage = function (evt) {
                try {
                    var msg = JSON.parse(evt.data);
                    if (msg.type === 'notification') {
                        _push(msg.title || 'Notification', msg.body || '', msg.notifType || 'info');
                    }
                } catch (e) {}
            };

            _ws.onclose = function () {
                console.log('[WS_NOTIFY] Disconnected — reconnecting in', RECONNECT_MS, 'ms');
                _ws = null;
                setTimeout(_connectWS, RECONNECT_MS);
            };

            _ws.onerror = function (e) {
                console.warn('[WS_NOTIFY] WebSocket error', e);
            };

        } catch (e) {
            console.warn('[WS_NOTIFY] Could not open WebSocket:', e.message);
        }
    }

    /* ────────────────────────────────────────────────────────────
       Public API
    ──────────────────────────────────────────────────────────── */
    return {

        init: function () {
            if (_inited) return;
            _inited = true;

            _loadSeen();
            _seedSeen();         // mark existing items as already seen
            _hookLocalStorage(); // detect new items from Firebase sync writes
            _requestPermission();
            _connectWS();        // connect to WS server if URL is set

            console.log('[WS_NOTIFY] Initialised. WS server:', WS_URL || '(none — using Firebase listener only)');
        },

        /** Called by renderHeader to inject the bell button HTML */
        bellHTML: function () {
            return '<button id="wsBellBtn" onclick="WS_NOTIFY.toggle()" title="Notifications" '
                 + 'style="position:relative;background:none;border:none;cursor:pointer;font-size:20px;padding:4px 6px;line-height:1;vertical-align:middle;">'
                 + '🔔'
                 + '<span id="wsBellBadge" style="display:none;position:absolute;top:0;right:0;'
                 + 'min-width:16px;height:16px;padding:0 3px;border-radius:8px;'
                 + 'background:#e53935;color:#fff;font-size:10px;font-weight:700;'
                 + 'align-items:center;justify-content:center;line-height:16px;text-align:center;">0</span>'
                 + '</button>';
        },

        toggle: function () { _showPanel(); },

        clearAll: function () {
            _notifications = [];
            _unread = 0;
            _updateBell();
            var p = document.getElementById('wsNotifPanel');
            if (p) p.remove();
        },

        /** Manually push a notification (e.g. from other modules) */
        push: function (title, body, type) { _push(title, body, type); },

        /** Send a broadcast to WS server (for server-side fan-out) */
        broadcast: function (payload) {
            if (_ws && _ws.readyState === WebSocket.OPEN) {
                try { _ws.send(JSON.stringify(payload)); } catch (e) {}
            }
        },

        getUnread: function () { return _unread; }
    };

})();
