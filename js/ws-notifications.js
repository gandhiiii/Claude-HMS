// HMS — Hybrid Real-Time & Background Push Notification Layer
// Supports instant in-app pop cards + OS background notifications after app is closed via Service Worker (sw.js)
// Works across Web, Mobile APK (Capacitor), and Desktop (Electron).

var WS_NOTIFY = (function () {

    /* ── Config ── */
    var RECONNECT_MS = 4000;

    /* ── Keys to watch for new items ── */
    var WATCHED_KEYS = [
        'tasks', 'complaints', 'problems',
        'material_requests', 'hodRequests', 'suggestions',
        'ambulance', 'admissions', 'lostfound',
        'hodEquipmentServices', 'hodEquipmentBackdowns',
        'handovers'
    ];

    /* ── State ── */
    var _ws            = null;
    var _notifications = [];   // [{title, body, time, read, type, key}]
    var _unread        = 0;
    var _seenIds       = {};   // key -> [id, ...]
    var _recentPops    = {};   // key -> timestamp (deduplication)
    var _inited        = false;
    var _origLSSet     = null; // original localStorage.setItem
    var _wsConnected   = false;
    var _wsUrl         = null;
    var _sbInited      = false;
    var _sbChannel     = null;
    var _swReg         = null; // ServiceWorkerRegistration instance

    /* ────────────────────────────────────────────────────────────
       Dynamic Server Host Resolution
    ──────────────────────────────────────────────────────────── */
    function _resolveWsUrl() {
        try {
            var customHost = localStorage.getItem('hms_ws_host') || localStorage.getItem('hms_ws_server_url');
            if (customHost) {
                return customHost.startsWith('ws') ? customHost : 'ws://' + customHost + ':8765';
            }
            if (window.WS_SERVER_URL && window.WS_SERVER_URL.startsWith('ws')) {
                return window.WS_SERVER_URL;
            }
            var host = (window.location && window.location.hostname && window.location.hostname !== '' && window.location.hostname !== 'file:')
                ? window.location.hostname
                : 'localhost';
            var proto = (window.location && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
            return proto + '//' + host + ':8765';
        } catch (e) {
            return 'ws://localhost:8765';
        }
    }

    /* ────────────────────────────────────────────────────────────
       Deduplication Helper
    ──────────────────────────────────────────────────────────── */
    function _isDuplicatePop(title, body) {
        var key = String(title || '') + '::' + String(body || '');
        var now = Date.now();
        if (_recentPops[key] && (now - _recentPops[key] < 3000)) {
            return true;
        }
        _recentPops[key] = now;
        Object.keys(_recentPops).forEach(function (k) {
            if (now - _recentPops[k] > 10000) delete _recentPops[k];
        });
        return false;
    }

    /* ────────────────────────────────────────────────────────────
       Persistence of seen IDs & Notification History
    ──────────────────────────────────────────────────────────── */
    function _loadState() {
        try {
            var raw = localStorage.getItem('hms_ws_seen_ids');
            if (raw) _seenIds = JSON.parse(raw);
        } catch (e) {}

        try {
            var rawNotifs = localStorage.getItem('hms_ws_history');
            if (rawNotifs) {
                _notifications = JSON.parse(rawNotifs);
                _unread = _notifications.filter(function(n) { return !n.read; }).length;
            }
        } catch (e) {}
    }

    function _saveState() {
        try { localStorage.setItem('hms_ws_seen_ids', JSON.stringify(_seenIds)); } catch (e) {}
        try { localStorage.setItem('hms_ws_history', JSON.stringify(_notifications.slice(0, 60))); } catch (e) {}
    }

    /* ── Seed seen IDs from current local data ── */
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
        _saveState();
    }

    /* ────────────────────────────────────────────────────────────
       Relevance & Message Formatting
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
        if (key === 'hodEquipmentServices')  return ['IT', 'Facility', 'Maintenance'].some(function(x){ return x.toLowerCase() === (user.department||'').trim().toLowerCase(); });
        if (key === 'hodEquipmentBackdowns') return ['IT', 'Facility', 'Maintenance'].some(function(x){ return x.toLowerCase() === (user.department||'').trim().toLowerCase(); });
        if (key === 'handovers') return (user.role === 'hod' || user.role === 'super_admin' || user.role === 'admin') &&
            ['IT','Facility','Maintenance'].some(function(x){ return x.toLowerCase() === (user.department||'').trim().toLowerCase(); });
        return false;
    }

    function _getMessage(key, item) {
        var map = {
            tasks:             { icon: '📋', title: 'New Task',           body: item.title || item.description || 'Task assigned to you' },
            complaints:        { icon: '📝', title: 'New Complaint',       body: item.subject || item.description || 'Complaint filed' },
            problems:          { icon: '🔧', title: 'New Problem',         body: item.title || item.description || 'Problem reported' },
            material_requests: { icon: '📦', title: 'Material Request',    body: item.itemName || item.title || item.description || 'New request submitted' },
            hodRequests:       { icon: '👔', title: 'HOD Request',         body: item.title || item.subject || 'New HOD request' },
            suggestions:       { icon: '💡', title: 'New Suggestion',      body: item.subject || item.title || item.text || 'Suggestion received' },
            ambulance:         { icon: '🚑', title: 'Ambulance Alert',     body: item.patientName || item.destination || 'Ambulance call' },
            admissions:        { icon: '🏥', title: 'New Admission',       body: item.patientName || 'Patient admitted' },
            lostfound:         { icon: '🔍', title: 'Lost & Found',        body: item.itemName || item.description || 'Item reported' },
            hodEquipmentServices:  { icon: '🔧', title: 'Equipment Service',  body: (item.assetName||'Equipment') + ' — ' + (item.serviceType||'service') + ' record added' },
            hodEquipmentBackdowns: { icon: '📉', title: 'Breakdown Alert',    body: (item.assetName||'Equipment') + ' — ' + (item.reason||'Breakdown reported') },
            handovers:             { icon: '🔄', title: 'Shift Handover',     body: (item.employeeName||'Employee') + ' handed over ' + (item.shift||'') + ' shift' + (item.summary ? ': ' + item.summary : '') }
        };
        var m = map[key] || { icon: '🔔', title: 'Update', body: 'New data received' };
        return { icon: m.icon, title: m.icon + ' ' + m.title, body: m.body };
    }

    /* ────────────────────────────────────────────────────────────
       Sound & Haptic Feedback
    ──────────────────────────────────────────────────────────── */
    function _playChime() {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            var ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
    }

    function _vibrate() {
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate([120, 80, 120]);
            }
        } catch (e) {}
    }

    /* ────────────────────────────────────────────────────────────
       On-Screen Pop Notification UI (Floating Top Card)
    ──────────────────────────────────────────────────────────── */
    function _injectPopStyles() {
        if (document.getElementById('wsPopStyles')) return;
        var style = document.createElement('style');
        style.id = 'wsPopStyles';
        style.textContent = [
            '@keyframes wsPopSlideDown {',
            '  0% { opacity: 0; transform: translateY(-30px) scale(0.92); }',
            '  70% { opacity: 1; transform: translateY(4px) scale(1.02); }',
            '  100% { opacity: 1; transform: translateY(0) scale(1); }',
            '}',
            '@keyframes wsPopProgress {',
            '  0% { width: 100%; }',
            '  100% { width: 0%; }',
            '}',
            '#wsPopContainer {',
            '  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);',
            '  z-index: 999999; display: flex; flex-direction: column; gap: 10px;',
            '  width: 92%; max-width: 440px; pointer-events: none;',
            '}',
            '.ws-pop-card {',
            '  pointer-events: auto; background: rgba(255, 255, 255, 0.96);',
            '  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);',
            '  border: 1px solid rgba(0, 0, 0, 0.08); border-left: 5px solid #4285F4;',
            '  border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06);',
            '  padding: 12px 14px; position: relative; overflow: hidden; cursor: pointer;',
            '  animation: wsPopSlideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;',
            '  transition: transform 0.2s ease, opacity 0.2s ease;',
            '}',
            '.ws-pop-card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.22); }',
            '.ws-pop-card.pop-success { border-left-color: #34A853; }',
            '.ws-pop-card.pop-warning { border-left-color: #FBBC05; }',
            '.ws-pop-card.pop-danger  { border-left-color: #EA4335; }',
            '.ws-pop-card.pop-info    { border-left-color: #4285F4; }',
            '.ws-pop-progress {',
            '  position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(66, 133, 244, 0.6);',
            '  animation: wsPopProgress 5s linear forwards;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function _showPopCard(title, body, type, key) {
        _injectPopStyles();
        var container = document.getElementById('wsPopContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'wsPopContainer';
            document.body.appendChild(container);
        }

        // Keep maximum 3 cards on screen
        var cards = container.querySelectorAll('.ws-pop-card');
        if (cards.length >= 3) {
            cards[0].remove();
        }

        var cardType = type || 'info';
        var card = document.createElement('div');
        card.className = 'ws-pop-card pop-' + cardType;

        var progressColor = (cardType === 'success') ? '#34A853' : (cardType === 'danger') ? '#EA4335' : (cardType === 'warning') ? '#FBBC05' : '#4285F4';

        card.innerHTML = [
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">',
            '  <div style="font-weight:700;font-size:14px;color:#1a1a1a;line-height:1.2;display:flex;align-items:center;gap:6px;">',
            '    <span>' + _esc(title) + '</span>',
            '  </div>',
            '  <div style="display:flex;align-items:center;gap:6px;">',
            '    <span style="font-size:10px;color:#888;white-space:nowrap;">Just now</span>',
            '    <button class="ws-close-btn" style="border:none;background:none;cursor:pointer;font-size:14px;color:#999;padding:0 2px;line-height:1;">✕</button>',
            '  </div>',
            '</div>',
            '<div style="font-size:12px;color:#555;margin-top:4px;line-height:1.35;word-break:break-word;">' + _esc(body) + '</div>',
            '<div class="ws-pop-progress" style="background:' + progressColor + '"></div>'
        ].join('');

        // Dismiss on click close button
        var closeBtn = card.querySelector('.ws-close-btn');
        closeBtn.onclick = function (e) {
            e.stopPropagation();
            _dismissCard(card);
        };

        // Click card opens notification drawer or navigates to section
        card.onclick = function () {
            _dismissCard(card);
            if (key && typeof Router !== 'undefined' && Router.navigate) {
                var targetModule = (key === 'hodEquipmentServices' || key === 'hodEquipmentBackdowns') ? 'hod-dashboard'
                    : (key === 'material_requests') ? 'material-requests'
                    : (key === 'lostfound') ? 'lost-found'
                    : key;
                try { Router.navigate(targetModule); return; } catch (e) {}
            }
            _showPanel();
        };

        container.appendChild(card);

        // Auto dismiss timer (5 seconds)
        var timer = setTimeout(function () {
            _dismissCard(card);
        }, 5000);

        // Pause countdown on hover
        card.onmouseenter = function () {
            clearTimeout(timer);
            var bar = card.querySelector('.ws-pop-progress');
            if (bar) bar.style.animationPlayState = 'paused';
        };
        card.onmouseleave = function () {
            var bar = card.querySelector('.ws-pop-progress');
            if (bar) bar.style.animationPlayState = 'running';
            timer = setTimeout(function () { _dismissCard(card); }, 2500);
        };
    }

    function _dismissCard(card) {
        if (!card || !card.parentNode) return;
        card.style.opacity = '0';
        card.style.transform = 'translateY(-15px) scale(0.95)';
        setTimeout(function () {
            if (card && card.parentNode) card.remove();
        }, 200);
    }

    /* ────────────────────────────────────────────────────────────
       Supabase (PostgreSQL Realtime) Notification Fan-Out & Listener
    ──────────────────────────────────────────────────────────── */
    function _initSupabaseListener() {
        if (!window.SB_DB || _sbInited) return;
        _sbInited = true;

        try {
            var sessionStartTime = Date.now();
            _sbChannel = window.SB_DB
                .channel('hms-live-pops-realtime')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'hms_live_pops' },
                    function (payload) {
                        var val = payload.new && payload.new.payload;
                        if (!val || !val.timestamp) return;

                        // Ignore pop messages from before current session or from self
                        if (val.timestamp < sessionStartTime - 3000) return;
                        var user = _getUser();
                        var myId = user ? (user.id || user.username) : null;
                        if (myId && val.senderId === myId) return;

                        // Push pop notification (deduplication prevents double pops)
                        _push(val.title, val.body, val.notifType || val.type || 'info', true, val.key);
                    })
                .subscribe(function (status) {});
            console.log('[WS_NOTIFY] Supabase Realtime Database live_pops listener active ✓');
        } catch (e) {
            console.warn('[WS_NOTIFY] Supabase listener notice:', e.message);
        }
    }

    function _broadcastSupabase(title, body, type, key) {
        if (!window.SB_DB) return;
        try {
            var user = _getUser();
            window.SB_DB.from('hms_live_pops').insert({
                payload: {
                    title:     title,
                    body:      body,
                    notifType: type || 'info',
                    key:       key || null,
                    senderId:  user ? (user.id || user.username) : 'anon',
                    timestamp: Date.now()
                }
            }).then(function (res) {
                if (res && res.error) console.warn('[WS_NOTIFY] live_pops insert error:', res.error.message);
            });
        } catch (e) {}
    }

    /* ────────────────────────────────────────────────────────────
       Detect local new items in watched keys
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
                // Push local Pop notification
                _push(msg.title, msg.body, 'info', false, key);

                // Broadcast over WebSocket
                if (_ws && _ws.readyState === WebSocket.OPEN) {
                    try {
                        _ws.send(JSON.stringify({
                            type:      'broadcast',
                            to:        'all',
                            title:     msg.title,
                            body:      msg.body,
                            notifType: 'info',
                            key:       key,
                            itemId:    item.id
                        }));
                    } catch (e) {}
                }

                // Broadcast over Supabase Realtime Database
                _broadcastSupabase(msg.title, msg.body, 'info', key);
            }
        });

        if (changed) _saveState();
    }

    /* ── Hook localStorage.setItem to detect real-time additions ── */
    function _hookLocalStorage() {
        if (_origLSSet) return;
        _origLSSet = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function (k, v) {
            _origLSSet(k, v);
            if (k === 'hms_ws_seen_ids' || k === 'hms_ws_history') return;
            WATCHED_KEYS.forEach(function (key) {
                if (k === 'hms_' + key) {
                    try { _checkForNew(key, JSON.parse(v)); } catch (e) {}
                }
            });
        };
    }

    /* ────────────────────────────────────────────────────────────
       Background Service Worker Registration & OS Push Notifications
    ──────────────────────────────────────────────────────────── */
    function _initServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        try {
            navigator.serviceWorker.register('sw.js').then(function (reg) {
                _swReg = reg;
                console.log('[WS_NOTIFY] Service Worker active ✓ scope:', reg.scope);

                // Auto-update check: when sw.js or app code is updated on server
                reg.onupdatefound = function () {
                    var installingWorker = reg.installing;
                    if (!installingWorker) return;
                    installingWorker.onstatechange = function () {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                console.log('[WS_NOTIFY] New app update installed! Refreshing...');
                                try {
                                    if (typeof APP !== 'undefined' && APP.notify) {
                                        APP.notify('🚀 New App Update Ready! Refreshing...', 'info');
                                    }
                                } catch (e) {}
                                setTimeout(function () { window.location.reload(true); }, 800);
                            }
                        }
                    };
                };
            }).catch(function (err) {
                console.warn('[WS_NOTIFY] SW registration notice:', err);
            });

            // Auto-reload when new controller takes over
            var _refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (_refreshing) return;
                _refreshing = true;
                console.log('[WS_NOTIFY] Controller changed — reloading for latest version');
                window.location.reload(true);
            });
        } catch (e) {}
    }

    function _requestPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            try {
                Notification.requestPermission().then(function (perm) {
                    if (perm === 'granted') {
                        console.log('[WS_NOTIFY] Background notification permission granted ✓');
                    }
                }).catch(function () {});
            } catch (e) {}
        }
        _initServiceWorker();
    }

    function _browserNotify(title, body, key) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        var options = {
            body: body,
            icon: 'assets/stavya-logo.png',
            badge: 'assets/stavya-logo.png',
            tag: 'hms-bg-' + Date.now(),
            renotify: true,
            vibrate: [150, 75, 150],
            data: { url: 'dashboard.html', key: key || null }
        };

        // Option A: Use Service Worker for OS-level background notifications (works after app is closed)
        if (_swReg && _swReg.showNotification) {
            try {
                _swReg.showNotification(title, options);
                return;
            } catch (e) {}
        }

        // Option B: Standard Notification API (when tab is backgrounded)
        if (!document.hasFocus()) {
            try {
                new Notification(title, options);
            } catch (e) {}
        }
    }

    /* ────────────────────────────────────────────────────────────
       Core Push Action — Updates State, Bell, Banner, Audio & Haptics
    ──────────────────────────────────────────────────────────── */
    function _push(title, body, type, isRemote, key) {
        if (_isDuplicatePop(title, body)) return; // deduplication filter

        _notifications.unshift({ title: title, body: body, type: type || 'info', time: Date.now(), read: false, key: key || null });
        if (_notifications.length > 60) _notifications.pop();
        _unread++;
        _saveState();
        _updateBell();
        _playChime();
        _vibrate();
        _browserNotify(title, body, key);
        _showPopCard(title, body, type || 'info', key);

        if (!isRemote) {
            // Push via Supabase Realtime Database
            _broadcastSupabase(title, body, type || 'info', key);
        }

        try {
            if (typeof APP !== 'undefined' && APP.notify) {
                APP.notify(title + ': ' + body, type || 'info');
            }
        } catch (e) {}
    }

    /* ────────────────────────────────────────────────────────────
       Header Bell UI & Dropdown Panel
    ──────────────────────────────────────────────────────────── */
    function _updateBell() {
        var badge = document.getElementById('wsBellBadge');
        if (!badge) return;
        badge.textContent = _unread > 99 ? '99+' : String(_unread);
        badge.style.display = _unread > 0 ? 'flex' : 'none';
        if (_unread > 0) {
            badge.style.animation = 'none';
            badge.offsetHeight; // trigger reflow
            badge.style.animation = 'pulse 1.2s infinite';
        }
    }

    function _showPanel() {
        var existing = document.getElementById('wsNotifPanel');
        if (existing) { existing.remove(); return; }

        var panel = document.createElement('div');
        panel.id = 'wsNotifPanel';
        panel.style.cssText = [
            'position:fixed',
            'top:58px',
            'right:12px',
            'width:330px',
            'max-height:450px',
            'overflow-y:auto',
            'background:var(--white, #fff)',
            'border:1px solid var(--border, #e0e0e0)',
            'border-radius:var(--radius, 10px)',
            'box-shadow:0 12px 32px rgba(0,0,0,0.2)',
            'z-index:100000',
            'font-family:inherit'
        ].join(';');

        var wsStatus = _wsConnected
            ? '<span style="color:#34A853;font-size:10px;font-weight:600;">● WS Connected</span>'
            : '<span style="color:#888;font-size:10px;font-weight:600;">○ WS Standby</span>';

        var sbStatus = window.SB_DB
            ? '<span style="color:#34A853;font-size:10px;font-weight:600;">🗄️ Supabase Live</span>'
            : '<span style="color:#888;font-size:10px;font-weight:600;">🗄 Supabase Off</span>';

        var swStatus = ('serviceWorker' in navigator && navigator.serviceWorker.controller)
            ? '<span style="color:#34A853;font-size:10px;font-weight:600;" title="Notifications run even when app is closed">⚡ BG Worker Active</span>'
            : '<span style="color:#1a73e8;font-size:10px;font-weight:600;" title="Tap to enable background notifications">⚡ BG Ready</span>';

        var items = _notifications.length === 0
            ? '<div style="padding:32px 16px;text-align:center;color:#888;font-size:13px;">No notifications yet</div>'
            : _notifications.map(function (n) {
                var ago = _timeAgo(n.time);
                var bg  = n.read ? 'transparent' : 'rgba(66,133,244,0.08)';
                return '<div style="padding:10px 14px;border-bottom:1px solid var(--light-gray,#f0f0f0);background:' + bg + ';cursor:pointer;" onclick="WS_NOTIFY.handleItemClick(\'' + (n.key || '') + '\')">'
                    + '<div style="font-size:13px;font-weight:600;color:var(--text,#222);">' + _esc(n.title) + '</div>'
                    + '<div style="font-size:12px;color:var(--gray,#666);margin-top:2px;line-height:1.3;">' + _esc(n.body) + '</div>'
                    + '<div style="font-size:10px;color:#aaa;margin-top:4px;">' + ago + '</div>'
                    + '</div>';
            }).join('');

        panel.innerHTML =
            '<div style="padding:12px 14px;border-bottom:1px solid var(--border,#e0e0e0);background:#f8f9fa;border-top-left-radius:10px;border-top-right-radius:10px;">'
          +   '<div style="display:flex;justify-content:space-between;align-items:center;">'
          +     '<span style="font-weight:700;font-size:14px;">🔔 Notifications</span>'
          +     '<button onclick="WS_NOTIFY.clearAll()" style="border:none;background:none;cursor:pointer;font-size:11px;color:#888;">Clear all</button>'
          +   '</div>'
          +   '<div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">'
          +     '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + sbStatus + ' ' + wsStatus + ' ' + swStatus + '</div>'
          +     '<button onclick="WS_NOTIFY.testPop()" style="border:1px solid #c2d7f8;background:#e8f0fe;color:#1a73e8;cursor:pointer;font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;">Test Pop 🚀</button>'
          +   '</div>'
          + '</div>'
          + items;

        document.body.appendChild(panel);

        // Mark all as read
        _notifications.forEach(function (n) { n.read = true; });
        _unread = 0;
        _saveState();
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
       WebSocket Connection Handler
    ──────────────────────────────────────────────────────────── */
    function _connectWS() {
        _wsUrl = _resolveWsUrl();
        if (!_wsUrl) return;

        try {
            console.log('[WS_NOTIFY] Connecting WS →', _wsUrl);
            _ws = new WebSocket(_wsUrl);

            _ws.onopen = function () {
                _wsConnected = true;
                console.log('[WS_NOTIFY] WebSocket Connected ✓ →', _wsUrl);

                var user = _getUser();
                if (user && _ws.readyState === WebSocket.OPEN) {
                    _ws.send(JSON.stringify({
                        type:   'auth',
                        userId: user.id || user.username,
                        role:   user.role,
                        dept:   user.department || null
                    }));
                }
            };

            _ws.onmessage = function (evt) {
                try {
                    var msg = JSON.parse(evt.data);
                    if (msg.type === 'notification') {
                        _push(msg.title || 'Notification', msg.body || '', msg.notifType || 'info', true, msg.key);
                    } else if (msg.type === 'reload') {
                        console.log('[WS_NOTIFY] Reload signal received. Refreshing page...');
                        window.location.reload();
                    }
                } catch (e) {}
            };

            _ws.onclose = function () {
                _wsConnected = false;
                _ws = null;
                console.log('[WS_NOTIFY] WebSocket Disconnected. Reconnecting in', RECONNECT_MS, 'ms...');
                setTimeout(_connectWS, RECONNECT_MS);
            };

            _ws.onerror = function (e) {
                _wsConnected = false;
                console.warn('[WS_NOTIFY] WebSocket connection error');
            };

        } catch (e) {
            _wsConnected = false;
            console.warn('[WS_NOTIFY] Could not create WebSocket:', e.message);
            setTimeout(_connectWS, RECONNECT_MS * 2);
        }
    }

    /* ────────────────────────────────────────────────────────────
       Public API
    ──────────────────────────────────────────────────────────── */
    return {

        init: function () {
            if (_inited) return;
            _inited = true;

            _loadState();
            _seedSeen();            // seed seen IDs from current storage
            _hookLocalStorage();    // auto-detect new items written to localStorage
            _requestPermission();   // request OS push permissions & register sw.js
            _connectWS();           // connect to WebSocket server
            _initSupabaseListener(); // listen to Supabase Realtime Database live pops

            console.log('[WS_NOTIFY] Initialised. Hybrid Supabase + WebSocket + Background SW Active.');
        },

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
            _saveState();
            _updateBell();
            var p = document.getElementById('wsNotifPanel');
            if (p) p.remove();
        },

        push: function (title, body, type, key) {
            _push(title, body, type || 'info', false, key);
        },

        broadcast: function (payload) {
            if (_ws && _ws.readyState === WebSocket.OPEN) {
                try { _ws.send(JSON.stringify(payload)); } catch (e) {}
            }
            if (payload && payload.title) {
                _broadcastSupabase(payload.title, payload.body || '', payload.notifType || 'info', payload.key);
            }
        },

        testPop: function () {
            var user = _getUser();
            var senderName = user ? (user.fullName || user.username) : 'User';
            var title = '🔔 Test Background Pop Notification';
            var body = 'Real-time background pop notification triggered by ' + senderName;

            // Push locally with sound & pop card
            _push(title, body, 'info', false);

            // Broadcast to all other devices over WebSocket
            if (_ws && _ws.readyState === WebSocket.OPEN) {
                try {
                    _ws.send(JSON.stringify({
                        type:        'broadcast',
                        to:          'all',
                        title:       title,
                        body:        body,
                        notifType:   'info',
                        includeSelf: false
                    }));
                } catch (e) {}
            }

            // Broadcast to all other devices over Supabase Realtime Database
            _broadcastSupabase(title, body, 'info');
        },

        handleItemClick: function (key) {
            var p = document.getElementById('wsNotifPanel');
            if (p) p.remove();
            if (key && typeof Router !== 'undefined' && Router.navigate) {
                var targetModule = (key === 'hodEquipmentServices' || key === 'hodEquipmentBackdowns') ? 'hod-dashboard'
                    : (key === 'material_requests') ? 'material-requests'
                    : (key === 'lostfound') ? 'lost-found'
                    : key;
                try { Router.navigate(targetModule); } catch (e) {}
            }
        },

        setWsHost: function (host) {
            if (!host) return;
            localStorage.setItem('hms_ws_host', host);
            if (_ws) { try { _ws.close(); } catch(e){} }
            _connectWS();
        },

        getStatus: function () {
            return {
                wsConnected: _wsConnected,
                wsUrl: _wsUrl,
                sbConnected: !!window.SB_DB,
                swActive: !!_swReg
            };
        },

        getUnread: function () { return _unread; }
    };

})();
