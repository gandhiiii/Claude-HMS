const DB = {
    _channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hms_sync') : null,
    _listeners: [],

    on(event, fn) {
        this._listeners.push({ event, fn });
    },
    _emit(event, data) {
        this._listeners.filter(l => l.event === event).forEach(l => l.fn(data));
        if (this._channel) {
            try { this._channel.postMessage({ event, data, timestamp: Date.now() }); } catch(e) {}
        }
    },

    get(key) {
        try {
            var raw = localStorage.getItem('hms_' + key);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        try {
            var raw = sessionStorage.getItem('hms_' + key);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    },
    set(key, data) {
        var json = JSON.stringify(data);
        try { localStorage.setItem('hms_' + key, json); } catch (e) { console.warn('localStorage set error:', e); }
        try { sessionStorage.setItem('hms_' + key, json); } catch (e) { console.warn('sessionStorage set error:', e); }
    },
    add(key, item) {
        this._autoSnapBeforeChange(key, 'add');
        const items = this.get(key);
        item.id = Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        item.createdAt = new Date().toISOString();
        items.push(item);
        this.set(key, items);
        this._emit('change', { store: key, action: 'add', id: item.id });
        return item;
    },
    update(key, id, updates) {
        this._autoSnapBeforeChange(key, 'update');
        const items = this.get(key);
        const idx = items.findIndex(i => i.id === id);
        if (idx > -1) {
            items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
            this.set(key, items);
            this._emit('change', { store: key, action: 'update', id });
            return items[idx];
        }
        return null;
    },
    delete(key, id) {
        this._autoSnapBeforeChange(key, 'delete');
        const items = this.get(key).filter(i => i.id !== id);
        this.set(key, items);
        this._emit('change', { store: key, action: 'delete', id });
    },
    getById(key, id) {
        return this.get(key).find(i => i.id === id) || null;
    },

    /* ── All keys synced to Firebase / exported in backups ── */
    _ALL_KEYS: [
        'users', 'departments', 'featureRights',
        'inventory', 'inventory_receipts',
        'gatesecurity', 'phase2Tasks',
        'projects', 'ambulance', 'ambulance_trips',
        'problems', 'tasks', 'hodTasks', 'hodRequests',
        'complaints', 'roomchecklists', 'admissions', 'rooms', 'roomStatus',
        'lostfound', 'adminChecklist', 'checklists',
        'material_requests', 'suggestions', 'reports',
        'roomCleaningTasks', 'floorItems',
        'budgets', 'budget_expenses', 'quarterly_priorities'
    ],

    /* Export all app data as a downloadable JSON file */
    exportAll(label) {
        try {
            var snapshot = { _meta: { exportedAt: new Date().toISOString(), label: label || 'manual', appVersion: (typeof APP !== 'undefined' ? APP._APP_VERSION : 'hms') }, data: {} };
            this._ALL_KEYS.forEach(function(key) {
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) snapshot.data[key] = JSON.parse(raw);
                } catch(e) {}
            });
            var json = JSON.stringify(snapshot, null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            var date = new Date().toISOString().slice(0, 10);
            a.href     = url;
            a.download = 'HMS_Backup_' + date + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch(e) {
            console.warn('DB.exportAll error:', e);
            return false;
        }
    },

    /* Import / restore from a backup JSON file — merges by id, preserving local-only records */
    importAll(json, replaceAll) {
        try {
            var snapshot = JSON.parse(json);
            var data = snapshot.data || snapshot; // support both wrapped and bare formats
            var count = 0;
            Object.keys(data).forEach(function(key) {
                if (DB._ALL_KEYS.indexOf(key) === -1) return;
                var incoming = data[key];
                if (!Array.isArray(incoming) && typeof incoming !== 'object') return;
                if (replaceAll || !Array.isArray(incoming)) {
                    DB.set(key, incoming);
                } else {
                    // Merge: incoming wins for shared ids, local-only items are kept
                    var existing = DB.get(key) || [];
                    var incomingIds = {};
                    incoming.forEach(function(i) { if (i && i.id) incomingIds[i.id] = true; });
                    var merged = incoming.slice();
                    existing.forEach(function(item) {
                        if (item && item.id && !incomingIds[item.id]) merged.push(item);
                    });
                    DB.set(key, merged);
                }
                count++;
            });
            return { success: true, keys: count, meta: snapshot._meta || {} };
        } catch(e) {
            return { success: false, error: e.message };
        }
    },

    /* Max backup slots kept in localStorage */
    _MAX_BK_SLOTS: 15,

    /* Auto-backup: saves a full snapshot; keeps up to _MAX_BK_SLOTS indexed backups */
    autoBackup(reason) {
        try {
            var appVer = (typeof APP !== 'undefined' ? APP._APP_VERSION : 'hms');
            var snapshot = { _meta: { exportedAt: new Date().toISOString(), label: reason || 'auto', appVersion: appVer }, data: {} };
            this._ALL_KEYS.forEach(function(key) {
                try {
                    var raw = localStorage.getItem('hms_' + key);
                    if (raw) snapshot.data[key] = JSON.parse(raw);
                } catch(e) {}
            });
            var json = JSON.stringify(snapshot);
            var now  = new Date().toISOString();

            // — Indexed slot system —
            var idx = [];
            try { idx = JSON.parse(localStorage.getItem('hms_bk_idx') || '[]'); } catch(e) {}
            var n;
            if (idx.length < this._MAX_BK_SLOTS) {
                var used = idx.map(function(e){ return e.n; });
                n = 0; while (used.indexOf(n) !== -1) n++;
            } else {
                idx.sort(function(a,b){ return new Date(a.ts) - new Date(b.ts); });
                n = idx[0].n;
                idx.splice(0, 1);
            }
            try { localStorage.setItem('hms_bk_' + n, json); } catch(storageErr) {
                // Storage full — free oldest slot and retry once
                if (idx.length > 0) {
                    idx.sort(function(a,b){ return new Date(a.ts) - new Date(b.ts); });
                    var freed = idx.shift();
                    try { localStorage.removeItem('hms_bk_' + freed.n); } catch(e2) {}
                    try { localStorage.setItem('hms_bk_' + n, json); } catch(e3) { return false; }
                }
            }
            idx.push({ n: n, ts: now, label: reason || 'auto' });
            try { localStorage.setItem('hms_bk_idx', JSON.stringify(idx)); } catch(e) {}

            // — Legacy slots (hms_backup_1/2/3) kept for compatibility —
            try {
                var b2 = localStorage.getItem('hms_backup_2');
                if (b2) localStorage.setItem('hms_backup_3', b2);
                var b1 = localStorage.getItem('hms_backup_1');
                if (b1) localStorage.setItem('hms_backup_2', b1);
                localStorage.setItem('hms_backup_1', json);
            } catch(e) {}
            try { localStorage.setItem('hms_backup_ts', now); } catch(e) {}
            return true;
        } catch(e) {
            return false;
        }
    },

    /* Throttled snapshot triggered before every DB mutation (max 1 per 3 min) */
    _autoSnapBeforeChange(key, action) {
        // Skip noisy internal keys to avoid unnecessary snapshots
        var skipKeys = ['problemDailyLog', 'pwResetRequests', 'adminChecklist',
                        'resetTokens', 'ambulance_trips'];
        if (skipKeys.indexOf(key) !== -1) return;
        try {
            var last  = parseInt(localStorage.getItem('hms_bk_last_change_ts') || '0', 10);
            var gap   = 3 * 60 * 1000; // 3 minutes
            if (Date.now() - last < gap) return;
            localStorage.setItem('hms_bk_last_change_ts', Date.now().toString());
            this.autoBackup('before-' + action + ':' + key);
        } catch(e) {}
    },

    /* Return the backup index (newest-first) */
    getBackupIndex() {
        try {
            var idx = JSON.parse(localStorage.getItem('hms_bk_idx') || '[]');
            return idx.sort(function(a,b){ return new Date(b.ts) - new Date(a.ts); });
        } catch(e) { return []; }
    },

    /* Restore all data from slot n (full replace) */
    restoreFromSlot(n) {
        var raw = localStorage.getItem('hms_bk_' + n);
        if (!raw) return { success: false, error: 'Backup slot not found' };
        return this.importAll(raw, true);
    },

    /* Download slot n as a JSON file */
    downloadBackupSlot(n) {
        try {
            var raw = localStorage.getItem('hms_bk_' + n);
            if (!raw) { if (typeof APP !== 'undefined') APP.notify('Backup not found', 'error'); return; }
            var meta = JSON.parse(raw)._meta || {};
            var ts   = (meta.exportedAt || new Date().toISOString()).slice(0, 16).replace(/[:T]/g, '-');
            var lbl  = (meta.label || 'backup').replace(/[^a-z0-9_-]/gi, '-');
            var blob = new Blob([raw], { type: 'application/json' });
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            a.href = url; a.download = 'hms-' + lbl + '-' + ts + '.json';
            document.body.appendChild(a); a.click();
            setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        } catch(e) {}
    },

    /* Restore from the latest backup (legacy helper kept for compatibility) */
    restoreLatestBackup() {
        var idx = this.getBackupIndex();
        if (idx.length > 0) return this.restoreFromSlot(idx[0].n);
        var raw = localStorage.getItem('hms_backup_1');
        if (!raw) return { success: false, error: 'No backup found' };
        return this.importAll(raw, false);
    }
};

const AUTH = {
    _sid() {
        try {
            let p = new URLSearchParams(window.location.search);
            let s = p.get('sid');
            if (s && localStorage.getItem('hms_sid_' + s)) return s;
        } catch (e) {}
        try {
            let t = sessionStorage.getItem('hms_t');
            if (t && localStorage.getItem('hms_sid_' + t)) return t;
        } catch (e) {}
        try {
            let s = localStorage.getItem('hms_activeSid');
            if (s && localStorage.getItem('hms_sid_' + s)) return s;
        } catch (e) {}
        return null;
    },
    init() {
        try {
            if (!localStorage.getItem('hms_resetTokens') || typeof DB.get('resetTokens')?.length === 'undefined') {
                DB.set('resetTokens', []);
            }
        } catch (e) {
            console.warn('AUTH.init error:', e);
        }
    },
    login(username, password) {
        try {
            let users = DB.get('users');
            if (!Array.isArray(users) || users.length === 0) {
                return { success: false, message: 'No accounts found. Please complete first-time setup.' };
            }
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                let sid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
                try { localStorage.setItem('hms_currentUser', JSON.stringify(user)); } catch (e) {}
                try { localStorage.setItem('hms_loginTime', new Date().toISOString()); } catch (e) {}
                try { localStorage.setItem('hms_sid_' + sid, JSON.stringify(user)); } catch (e) {}
                try { localStorage.setItem('hms_activeSid', sid); } catch (e) {}
                try { sessionStorage.setItem('hms_t', sid); } catch (e) {}
                return { success: true, user, sid };
            }
            return { success: false, message: 'Invalid username or password' };
        } catch (e) {
            return { success: false, message: 'Login error: ' + e.message };
        }
    },
    logout() {
        try {
            let sid = this._sid();
            if (sid) localStorage.removeItem('hms_sid_' + sid);
        } catch (e) {}
        localStorage.removeItem('hms_currentUser');
        localStorage.removeItem('hms_loginTime');
        localStorage.removeItem('hms_activeSid');
        localStorage.removeItem('hms_lastModule');
        try { sessionStorage.removeItem('hms_t'); } catch (e) {}
    },
    currentUser() {
        try {
            let sid = this._sid();
            if (sid) {
                let d = localStorage.getItem('hms_sid_' + sid);
                if (d) return JSON.parse(d);
            }
        } catch (e) {}
        try {
            let p = new URLSearchParams(window.location.search);
            let s = p.get('sid');
            if (s) {
                let d = localStorage.getItem('hms_sid_' + s);
                if (d) return JSON.parse(d);
            }
        } catch (e) {}
        try {
            let d = localStorage.getItem('hms_currentUser');
            if (d) return JSON.parse(d);
        } catch (e) {}
        return null;
    },
    isLoggedIn() {
        return !!this.currentUser();
    },
    requestReset(identifier) {
        const users = DB.get('users');
        const user = users.find(u => u.username === identifier || u.email === identifier || u.phone === identifier);
        if (!user) return { success: false, message: 'User not found' };
        const token = Date.now().toString(36) + Math.random().toString(36).substr(2, 8).toUpperCase();
        const tokens = DB.get('resetTokens');
        tokens.push({
            token,
            userId: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            expires: new Date(Date.now() + 3600000).toISOString(),
            used: false
        });
        DB.set('resetTokens', tokens);

        const resetLink = `${window.location.origin}${window.location.pathname}?reset=${token}`;
        const msg = `Reset link sent!\nLink: ${resetLink}\n(Would send to ${user.email} and SMS to ${user.phone})`;
        return { success: true, message: msg, token, user };
    },
    verifyResetToken(token) {
        const tokens = DB.get('resetTokens');
        const t = tokens.find(tk => tk.token === token && !tk.used && new Date(tk.expires) > new Date());
        return t || null;
    },
    resetPassword(token, newPassword) {
        const tokens = DB.get('resetTokens');
        const t = tokens.find(tk => tk.token === token && !tk.used && new Date(tk.expires) > new Date());
        if (!t) return { success: false, message: 'Invalid or expired token' };
        DB.update('users', t.userId, { password: newPassword });
        t.used = true;
        DB.set('resetTokens', tokens);
        return { success: true, message: 'Password reset successful!' };
    },
    hasPermission(user, permission) {
        if (!user) return false;
        // Budget is strictly admin-only — cannot be granted via feature rights
        if (permission === 'budget') return user.isSuperAdmin || user.role === 'admin';
        if (permission === 'quarterly-priorities') return user.isSuperAdmin || user.role === 'admin';
        if (user.isSuperAdmin || (user.permissions && user.permissions.includes('all'))) return true;
        // Role-based auto-grants (no manual permission config needed)
        if (permission === 'hod-dashboard' && user.role === 'hod') return true;
        if (permission === 'employee-dashboard' && (user.role === 'employee' || user.role === 'hod')) return true;
        // HOD auto-gets admissions, checklists, material-requests so they can manage their dept
        if (user.role === 'hod' && ['admissions','checklists','material-requests','problems','tasks'].indexOf(permission) !== -1) return true;
        return user.permissions && user.permissions.includes(permission);
    },
    canAccess(permission) {
        const user = this.currentUser();
        return this.hasPermission(user, permission);
    }
};

const FLOOR_ITEMS = [
    { floor: 'Shared (B3-7F)', items: [
        { name: 'Fire doors B-3 to 7th floor', unit: '' },
        { name: 'Plumbing duct doors B-3 to 7th floor', unit: '' },
        { name: 'Electrical duct doors B-3 to 7th floor', unit: '' },
        { name: 'IT duct doors B-3 to 7th floor', unit: '' },
        { name: 'Lift panel duct doors B-3 to 7th floor', unit: '' },
        { name: 'HVAC duct doors B-3 to 7th floor', unit: '' },
        { name: 'Patient lift inside', unit: '' },
        { name: 'Patient lift outside', unit: '' },
        { name: 'Fire lift', unit: '' },
        { name: 'Doctor lift', unit: '' },
    ]},
    { floor: 'DG Set / LT / UPS', items: [
        { name: 'DG set', unit: '' },
        { name: 'LT Panel and its room', unit: '' },
        { name: 'UPS Room', unit: '' },
        { name: 'UPS battery percentage', unit: '%' },
        { name: 'UPS incoming power voltage', unit: 'V' },
        { name: 'UPS outgoing power voltage', unit: 'V' },
    ]},
    { floor: 'Laundry', items: [
        { name: 'Washing machine', unit: '' },
        { name: 'Drying machine', unit: '' },
        { name: 'Pressing machine', unit: '' },
        { name: 'Air compressor', unit: 'bar' },
        { name: 'Laundry machine panel', unit: '' },
        { name: 'Laundry area fan', unit: '' },
        { name: 'Laundry area light', unit: '' },
        { name: 'Laundry area exhaust fan', unit: '' },
        { name: 'Laundry metal shed', unit: '' },
        { name: 'Laundry windows', unit: '' },
        { name: 'Laundry drainage', unit: '' },
    ]},
    { floor: 'Terrace', items: [
        { name: 'HVAC unit', unit: '' },
        { name: 'AHU unit', unit: '' },
        { name: 'Outdoor unit', unit: '' },
        { name: 'AC panel', unit: '' },
        { name: 'Bathroom exhaust fan', unit: '' },
        { name: 'Canteen exhaust fan', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Overhead water tank', unit: '' },
        { name: 'STP tank', unit: '' },
        { name: 'Raw water tank', unit: '' },
        { name: 'Fire tank', unit: '' },
        { name: 'RO system', unit: '' },
        { name: 'RO water tank', unit: '' },
        { name: 'Rain water drainage', unit: '' },
        { name: 'Solar panel cleaning status', unit: '%' },
        { name: 'Solar panel unit production', unit: 'kW' },
        { name: 'Plumbing line and valves', unit: '' },
        { name: 'Lift fresh air system', unit: '' },
        { name: 'Terrace lights', unit: '' },
    ]},
    { floor: 'Staircase', items: [
        { name: 'Staircase lights', unit: '' },
        { name: 'Glass and grab bar', unit: '' },
        { name: 'Fire extinguisher', unit: '' },
        { name: 'Windows', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Speaker', unit: '' },
        { name: 'Fire detector sensor', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
    ]},
    { floor: 'Ground to 6th Floor (Common)', items: [
        { name: 'Wooden doors', unit: '' },
        { name: 'Door handles', unit: '' },
        { name: 'Door stoppers', unit: '' },
        { name: 'Door closers', unit: '' },
        { name: 'Door locks', unit: '' },
        { name: 'HVAC filter cleaning', unit: '' },
        { name: 'HVAC cooling', unit: '°C' },
        { name: 'Light and fan', unit: '' },
        { name: 'Geyser', unit: '' },
        { name: 'Nurse calling system', unit: '' },
        { name: 'Camera alignment and working', unit: '' },
        { name: 'All computers', unit: '' },
        { name: 'All furniture and chairs', unit: '' },
        { name: 'Civil/paint condition', unit: '' },
        { name: 'Plumbing condition', unit: '' },
        { name: 'WiFi router', unit: '' },
        { name: 'Speakers', unit: '' },
        { name: 'Fire alarm', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
        { name: 'Fire detectors', unit: '' },
    ]},
    { floor: 'Basement-3 to Basement-1', items: [
        { name: 'Parking lift hydraulic fluid', unit: '' },
        { name: 'Parking lift alignment', unit: '' },
        { name: 'Fresh air fan', unit: '' },
        { name: 'Exhaust fan', unit: '' },
        { name: 'Lights and fan', unit: '' },
        { name: 'Fire alarm', unit: '' },
        { name: 'Fire sprinkler', unit: '' },
        { name: 'Fire detectors', unit: '' },
        { name: 'WiFi router and speakers', unit: '' },
        { name: 'Drainage', unit: '' },
        { name: 'Store room doors and locks', unit: '' },
        { name: 'Camera alignment', unit: '' },
        { name: 'Locker room, locker, light, fan, camera (B2)', unit: '' },
        { name: 'Store room light, fan, access point (B3)', unit: '' },
        { name: 'Fire system pumps (B2)', unit: '' },
        { name: 'MGPS station vacuum pumps (B1)', unit: '' },
        { name: 'MGPS air filters and tank (B1)', unit: '' },
        { name: 'MGPS air compressor fluid and filters (B1)', unit: '' },
        { name: 'LT panel room light and exhaust fan (B1)', unit: '' },
        { name: 'UPS room (B1)', unit: '' },
    ]},
    { floor: 'Ground Floor', items: [
        { name: 'Basement parking entrance', unit: '' },
        { name: 'Medical gas station', unit: '' },
        { name: 'Medical gas station lights', unit: '' },
        { name: 'Two-wheeler parking', unit: '' },
        { name: 'Canteen air washer', unit: '' },
        { name: 'Canteen TFA', unit: '' },
        { name: 'Canteen fridge-1', unit: '°C' },
        { name: 'Canteen fridge-2', unit: '°C' },
        { name: 'Canteen fridge-3', unit: '°C' },
        { name: 'Canteen deep freezer-1', unit: '°C' },
        { name: 'Canteen Bain Marie counter-1', unit: '°C' },
        { name: 'Canteen Bain Marie counter-2', unit: '°C' },
        { name: 'Medical fridge-1', unit: '°C' },
        { name: 'Medical fridge-2', unit: '°C' },
        { name: 'Physiotherapy area', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Main entrance', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Drinking water and cooler', unit: '' },
    ]},
    { floor: 'First Floor', items: [
        { name: 'MRI console room', unit: '' },
        { name: 'MRI technical room', unit: '' },
        { name: 'MRI UPS room', unit: '' },
        { name: 'MRI chiller room', unit: '°C' },
        { name: 'Open MRI', unit: '' },
        { name: 'CT scan console room', unit: '' },
        { name: 'CT scan technical room', unit: '' },
        { name: 'Xray room', unit: '' },
        { name: 'Sonography room', unit: '' },
        { name: 'Dexa scan room', unit: '' },
        { name: 'Admin office', unit: '' },
        { name: 'Marketing', unit: '' },
        { name: 'Discharge counter', unit: '' },
        { name: 'Admission counter', unit: '' },
        { name: 'Call center', unit: '' },
        { name: 'RCA/MD room', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Drinking water and cooler', unit: '' },
    ]},
    { floor: 'Second Floor', items: [
        { name: 'PG-1 OPD room', unit: '' },
        { name: 'PG-2 OPD room', unit: '' },
        { name: 'Physician room', unit: '' },
        { name: 'Physician testing room', unit: '' },
        { name: 'OPD-1 to OPD-13', unit: '' },
        { name: 'Research room', unit: '' },
        { name: 'Minor OT', unit: '' },
        { name: 'Blood collection room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Doctor zero room 1', unit: '' },
        { name: 'Doctor zero room 2', unit: '' },
        { name: 'Doctor bathroom', unit: '' },
        { name: 'Bathroom (Male)', unit: '' },
        { name: 'Bathroom (Female)', unit: '' },
        { name: 'Staff bathroom', unit: '' },
        { name: 'OPD TV', unit: '' },
        { name: 'Waiting TV', unit: '' },
        { name: 'Research room fridge-1', unit: '°C' },
        { name: 'Research room fridge-2', unit: '°C' },
    ]},
    { floor: 'Third Floor', items: [
        { name: 'HDU', unit: '' },
        { name: 'HDU dirty room', unit: '' },
        { name: 'HDU clean room', unit: '' },
        { name: 'PREOP room', unit: '' },
        { name: 'CSSD dirty room', unit: '' },
        { name: 'CSSD clean room', unit: '' },
        { name: 'CSSD implant storage', unit: '' },
        { name: 'OT-1', unit: '' },
        { name: 'OT-2', unit: '' },
        { name: 'OT-3', unit: '' },
        { name: 'OT-4', unit: '' },
        { name: 'OT-5', unit: '' },
        { name: 'OT-6', unit: '' },
        { name: 'Doctor room', unit: '' },
        { name: 'Doctor room TV', unit: '' },
        { name: 'Nursing staff room', unit: '' },
        { name: 'Nursing staff bathroom', unit: '' },
        { name: 'Janitor closet', unit: '' },
        { name: 'Doctors bathroom', unit: '' },
        { name: 'Changing room', unit: '' },
        { name: 'Lockers area', unit: '' },
        { name: 'Dumbwaiter room', unit: '' },
        { name: 'Biowaste room', unit: '' },
    ]},
    { floor: 'Fourth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
    { floor: 'Fifth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
    { floor: 'Sixth Floor', items: [
        { name: 'Patient room 2', unit: '' },
        { name: 'Patient room 3', unit: '' },
        { name: 'Patient room 4', unit: '' },
        { name: 'Patient room 5', unit: '' },
        { name: 'Patient room 6', unit: '' },
        { name: 'Patient room 7', unit: '' },
        { name: 'Patient room 8', unit: '' },
        { name: 'Patient room 9', unit: '' },
        { name: 'Patient room 10', unit: '' },
        { name: 'Patient room 11', unit: '' },
        { name: 'Patient room 12', unit: '' },
        { name: 'Patient room 13', unit: '' },
        { name: 'Patient room 14', unit: '' },
        { name: 'Patient room 15', unit: '' },
        { name: 'Patient room 16', unit: '' },
        { name: 'Patient room 17', unit: '' },
        { name: 'Staff bathroom (geyser, light, tap, flush)', unit: '' },
        { name: 'Janitor closet (1)', unit: '' },
        { name: 'Nursing room (light, fan)', unit: '' },
        { name: 'Reception', unit: '' },
        { name: 'Biowaste collection space', unit: '' },
        { name: 'Doctors lift space', unit: '' },
        { name: 'Linen storage rack space', unit: '' },
        { name: 'Janitor closet (2)', unit: '' },
        { name: 'Store room', unit: '' },
    ]},
];

APP_SYNC = {
    init() {
        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('hms_')) {
                this._flash();
                this._refresh();
            }
        });
        // Listen for BroadcastChannel messages (other tabs)
        if (DB._channel) {
            DB._channel.onmessage = (e) => {
                if (e.data && e.data.event === 'change') {
                    this._flash();
                    this._refresh();
                }
            };
        }
        window.addEventListener('beforeunload', () => this._cleanup());
        this._updateStatus();
    },
    _debounceTimer: null,
    _flash() {
        const el = document.getElementById('liveIndicator');
        if (!el) return;
        el.style.background = 'rgba(66,133,244,0.25)';
        el.style.borderColor = '#4285f4';
        setTimeout(() => this._updateStatus(), 500);
    },
    _updateStatus() {
        const el = document.getElementById('liveIndicator');
        if (!el) return;
        if (window.FB_DB) {
            el.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#34a853;animation:pulse 2s ease-in-out infinite;display:inline-block;flex-shrink:0;"></span><span style="color:#34a853;font-size:11px;font-weight:700;letter-spacing:0.3px;">LIVE</span>';
            el.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:12px;background:rgba(52,168,83,0.10);border:1px solid rgba(52,168,83,0.3);cursor:default;';
            el.title = 'Real-time sync active — changes on any device appear everywhere instantly';
            el.onclick = null;
        } else {
            el.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#9aa0a6;display:inline-block;flex-shrink:0;"></span><span style="color:#9aa0a6;font-size:11px;font-weight:600;">offline</span>';
            el.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:12px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.1);cursor:default;';
            el.title = 'No connection to database';
            el.onclick = null;
        }
    },
    _cleanup() {
        if (DB._channel) { try { DB._channel.close(); } catch(e) {} }
    },
    _refresh() {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            const mod = APP.currentModule;
            if (mod && window['refresh' + mod.charAt(0).toUpperCase() + mod.slice(1)]) {
                const fn = window['refresh' + mod.charAt(0).toUpperCase() + mod.slice(1)];
                if (typeof fn === 'function') fn();
            } else if (mod && APP.refreshCurrent) {
                APP.refreshCurrent();
            }
        }, 200);
    }
};

const APP = {
    currentModule: null,
    _APP_VERSION: 'v76',

    init() {
        try {
            // Auto-backup before anything else:
            // 1. Always backup when app version changes (code was updated)
            // 2. Also backup if more than 1 hour has passed since last backup
            try {
                var lastVer = localStorage.getItem('hms_app_version');
                var lastTs  = localStorage.getItem('hms_backup_ts');
                var hourAgo = new Date(Date.now() - 3600000).toISOString();
                var needsBackup = (lastVer !== APP._APP_VERSION) || !lastTs || lastTs < hourAgo;
                if (needsBackup) {
                    var reason = (lastVer && lastVer !== APP._APP_VERSION)
                        ? 'pre-update-' + lastVer + '-to-' + APP._APP_VERSION
                        : 'hourly-auto';
                    DB.autoBackup(reason);
                    localStorage.setItem('hms_app_version', APP._APP_VERSION);
                }
            } catch(_e) {}

            AUTH.init();
            this.seedData();
            try {
                var _users = DB.get('users') || [];
                var _clean = _users.filter(function(_u) { return _u && typeof _u === 'object' && typeof _u.fullName === 'string' && typeof _u.username === 'string'; });
                if (_clean.length !== _users.length) DB.set('users', _clean);
            } catch (_e) {}
            try {
                var _mr = DB.get('material_requests') || [];
                var _mrClean = _mr.filter(function(_r) { return _r && typeof _r === 'object' && typeof _r.title === 'string'; });
                if (_mrClean.length !== _mr.length) DB.set('material_requests', _mrClean);
            } catch (_e) {}
            try {
                var _sg = DB.get('suggestions') || [];
                var _sgClean = _sg.filter(function(_s) { return _s && typeof _s === 'object' && typeof _s.title === 'string'; });
                if (_sgClean.length !== _sg.length) DB.set('suggestions', _sgClean);
            } catch (_e) {}
            APP_SYNC.init();
        } catch (e) {
            console.warn('APP.init error:', e);
        }
    },
    refreshCurrent() {
        const mod = this.currentModule;
        if (!mod) return;
        const content = document.getElementById('pageContent');
        if (!content) return;
        const renderers = {
            dashboard: renderDashboard,
            users: renderUsers,
            departments: renderDepartments,
            'feature-rights': renderFeatureRights,
            inventory: renderInventory,
            'gate-security': renderGateSecurity,
            phase2: renderPhase2,
            projects: renderProjects,
            ambulance: renderAmbulance,
            problems: renderProblems,
            tasks: renderTasks,
            complaints: renderComplaints,
            'room-checklist': renderRoomChecklist,
            admissions: renderAdmissions,
            'lost-found': renderLostFound,
            'admin-checklists': renderAdminChecklists,
            checklists: renderChecklists,
            'material-requests': renderMaterialRequests,
            suggestions: renderSuggestions,
            budget: renderBudget,
            'quarterly-priorities': renderQPriorities,
            reports: renderReports,
            'employee-dashboard': renderEmployeeDashboard
        };
        if (renderers[mod]) {
            renderers[mod](content);
        }
    },
    seedData() {
        try {
            if (!Array.isArray(DB.get('departments')) || DB.get('departments').length === 0) {
                DB.set('departments', []);
            }
            const existingRights = DB.get('featureRights');
            if (!Array.isArray(DB.get('tasks')) || DB.get('tasks').length === 0) {
                DB.set('tasks', []);
            }
            if (!Array.isArray(DB.get('inventory')) || DB.get('inventory').length === 0) {
                DB.set('inventory', []);
            }
            if (!Array.isArray(DB.get('inventory_receipts')) || DB.get('inventory_receipts').length === 0) {
                DB.set('inventory_receipts', []);
            }
            if (!Array.isArray(DB.get('material_requests')) || DB.get('material_requests').length === 0) {
                DB.set('material_requests', []);
            }
            if (!Array.isArray(DB.get('suggestions')) || DB.get('suggestions').length === 0) {
                DB.set('suggestions', []);
            }
            if (!Array.isArray(DB.get('reports')) || DB.get('reports').length === 0) {
                DB.set('reports', []);
            }
            if (!Array.isArray(DB.get('budgets'))) {
                DB.set('budgets', []);
            }
            if (!Array.isArray(DB.get('budget_expenses'))) {
                DB.set('budget_expenses', []);
            }
            if (!Array.isArray(DB.get('quarterly_priorities'))) {
                DB.set('quarterly_priorities', []);
            }
            if (!Array.isArray(existingRights) || existingRights.length === 0) {
                const defaultRights = ['dashboard','users','departments','inventory','gate-security',
                    'projects','ambulance','problems','tasks','complaints',
                    'room-checklist','admissions','lost-found','checklists','admin-checklists',
                    'material-requests','suggestions','reports','employee-dashboard'];
                DB.set('featureRights', defaultRights);
            }
            const floors = DB.get('floorItems');
            if (!Array.isArray(floors) || floors.length === 0) {
                DB.set('floorItems', FLOOR_ITEMS);
            }
        } catch (e) {
            console.warn('seedData error:', e);
        }
    },
    notify(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    formatDate(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    formatDateTime(d) {
        if (!d) return '-';
        const dt = new Date(d);
        return dt.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    daysBetween(d1, d2) {
        const a = new Date(d1), b = new Date(d2);
        return Math.floor((b - a) / (1000 * 60 * 60 * 24));
    },
    lifecyclePercent(start, end) {
        const total = this.daysBetween(start, end);
        const elapsed = this.daysBetween(start, new Date().toISOString());
        if (total <= 0) return 100;
        const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
        return Math.round(pct);
    },
    lifecycleColor(pct) {
        if (pct < 50) return 'green';
        if (pct < 80) return 'yellow';
        return 'red';
    },
    getRoleBadge(role) {
        const colors = { admin: 'badge-danger', hod: 'badge-warning', storekeeper: 'badge-info', employee: 'badge-success', ambulance_employee: 'badge-info' };
        return colors[role] || 'badge-info';
    },
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    getStatusBadge(status) {
        const map = {
            'active': 'badge-success', 'inactive': 'badge-danger',
            'pending': 'badge-warning', 'approved': 'badge-success', 'rejected': 'badge-danger',
            'completed': 'badge-success', 'in-progress': 'badge-info',
            'discharged': 'badge-success', 'admitted': 'badge-info',
            'resolved': 'badge-success', 'open': 'badge-danger',
            'in': 'badge-info', 'out': 'badge-warning'
        };
        return map[status] || 'badge-info';
    }
};
APP.init();
