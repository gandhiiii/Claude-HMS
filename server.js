// ═══════════════════════════════════════════════════════════════════
// Stavya Intelligence HMS — Web & WebSocket Server
// ═══════════════════════════════════════════════════════════════════

'use strict';

const express   = require('express');
const http      = require('http');
const path      = require('path');
const fs        = require('fs');
const os        = require('os');
const WebSocket = require('ws');
const { Pool }  = require('pg');

const app        = express();
const httpServer = http.createServer(app);
const wss        = new WebSocket.Server({ server: httpServer });

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/* ── Cloud SQL Connection Pool (Object Method) ── */
let pool = null;
function getPool() {
    if (!pool && process.env.SQL_HOST) {
        pool = new Pool({
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 10,
            connectionTimeoutMillis: 15000,
        });
        pool.on('error', (err) => {
            console.error('Unexpected error on idle SQL pool client:', err);
        });
    }
    return pool;
}

/* ── Middleware ── */
app.use(express.json({ limit: '20mb' }));

/* ── Health check endpoint ── */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Stavya Intelligence HMS Server',
        clients: wss ? wss.clients.size : 0,
        uptime: Math.floor(process.uptime()) + 's',
        cloudSqlConfigured: !!process.env.SQL_HOST
    });
});

/* ── Memory / Disk Fallback Store for Server-side Sync ── */
const localStore = new Map();

/* ── Helper: Broadcast real-time sync updates to all connected clients ── */
function broadcastSyncUpdate(key, data) {
    if (!wss) return;
    const msg = JSON.stringify({ type: 'sync_update', key, data, ts: Date.now() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try { client.send(msg); } catch(e){}
        }
    });
}

let _storeDebounce = null;
function persistStoreSnapshotDebounced() {
    clearTimeout(_storeDebounce);
    _storeDebounce = setTimeout(() => {
        try {
            const snapshot = {};
            for (const [k, v] of localStore.entries()) {
                snapshot[k] = v.data;
            }
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(path.join(dataDir, 'hms_store.json'), JSON.stringify(snapshot, null, 2), 'utf8');

            const wwwDataDir = path.join(__dirname, 'www', 'data');
            if (!fs.existsSync(wwwDataDir)) fs.mkdirSync(wwwDataDir, { recursive: true });
            fs.writeFileSync(path.join(wwwDataDir, 'hms_store.json'), JSON.stringify(snapshot, null, 2), 'utf8');
        } catch (e) {}
    }, 1000);
}

/* ── Helper: Persist updated users to disk so Git tracks them ── */
function persistUsersToDisk(users) {
    if (!Array.isArray(users) || users.length === 0) return;
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');

        const wwwDataDir = path.join(__dirname, 'www', 'data');
        if (!fs.existsSync(wwwDataDir)) fs.mkdirSync(wwwDataDir, { recursive: true });
        fs.writeFileSync(path.join(wwwDataDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');

        // Update getDefaultUsers in js/data.js and www/js/data.js
        const fnStr = 'function getDefaultUsers() {\n    return ' + JSON.stringify(users, null, 4) + ';\n}\n';
        ['js/data.js', 'www/js/data.js'].forEach(rel => {
            const fp = path.join(__dirname, rel);
            if (fs.existsSync(fp)) {
                let content = fs.readFileSync(fp, 'utf8');
                const startIdx = content.indexOf('function getDefaultUsers() {');
                const endIdx = content.indexOf('window.getDefaultUsers = getDefaultUsers;');
                if (startIdx !== -1 && endIdx !== -1) {
                    content = content.substring(0, startIdx) + fnStr + content.substring(endIdx);
                    fs.writeFileSync(fp, content, 'utf8');
                }
            }
        });
        console.log(`[HMS Server] Persisted ${users.length} users to disk & updated getDefaultUsers`);
    } catch (e) {
        console.error('[HMS Server] Error persisting users to disk:', e.message);
    }
}

/* ── Cloud SQL Database Sync API ── */
app.get('/api/db/status', async (req, res) => {
    const p = getPool();
    if (!p) {
        return res.json({ configured: false, provider: 'Memory Store (Local / Standby)', storedKeys: localStore.size });
    }
    try {
        const result = await p.query('SELECT count(*) as count FROM hms_store');
        res.json({
            configured: true,
            provider: 'Google Cloud SQL (PostgreSQL)',
            database: process.env.SQL_DB_NAME,
            storedKeys: parseInt(result.rows[0].count, 10)
        });
    } catch (e) {
        res.status(500).json({ configured: true, error: e.message });
    }
});

app.get('/api/db/sync', async (req, res) => {
    const p = getPool();
    if (!p) {
        const rows = [];
        for (const [key, val] of localStore.entries()) {
            rows.push({ key, data: val.data, updated_at: val.updated_at });
        }
        return res.json({ success: true, connected: false, data: rows });
    }
    try {
        const result = await p.query('SELECT key, data, updated_at FROM hms_store');
        res.json({ success: true, connected: true, data: result.rows });
    } catch (e) {
        console.error('Cloud SQL sync read error:', e.message);
        const rows = [];
        for (const [key, val] of localStore.entries()) {
            rows.push({ key, data: val.data, updated_at: val.updated_at });
        }
        res.json({ success: true, connected: false, data: rows });
    }
});

app.post('/api/db/sync', async (req, res) => {
    const p = getPool();
    const { key, data, items } = req.body;

    // Always update local memory store & broadcast to all connected devices (mobile + desktop)
    if (items && Array.isArray(items)) {
        for (const item of items) {
            if (item.key) {
                localStore.set(item.key, { data: item.data, updated_at: new Date().toISOString() });
                broadcastSyncUpdate(item.key, item.data);
                if (item.key === 'users') {
                    persistUsersToDisk(item.data);
                }
            }
        }
    } else if (key) {
        localStore.set(key, { data: data, updated_at: new Date().toISOString() });
        broadcastSyncUpdate(key, data);
        if (key === 'users') {
            persistUsersToDisk(data);
        }
    }

    persistStoreSnapshotDebounced();

    if (!p) {
        return res.json({ success: true, count: items ? items.length : 1, mode: 'local' });
    }

    try {
        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (item.key) {
                    await p.query(
                        `INSERT INTO hms_store (key, data, updated_at)
                         VALUES ($1, $2, NOW())
                         ON CONFLICT (key) DO UPDATE
                         SET data = EXCLUDED.data, updated_at = NOW()`,
                        [item.key, JSON.stringify(item.data)]
                    );
                }
            }
            return res.json({ success: true, count: items.length });
        }
        if (!key) return res.status(400).json({ error: 'Missing key' });
        await p.query(
            `INSERT INTO hms_store (key, data, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE
             SET data = EXCLUDED.data, updated_at = NOW()`,
            [key, JSON.stringify(data)]
        );
        res.json({ success: true, key });
    } catch (e) {
        console.error('Cloud SQL sync write error:', e.message);
        // Fallback succeeded in localStore
        res.json({ success: true, key: key || 'items', warning: e.message });
    }
});

/* ── Direct Users Sync API ── */
app.get('/api/users', async (req, res) => {
    const p = getPool();
    if (p) {
        try {
            const result = await p.query("SELECT data FROM hms_store WHERE key = 'users'");
            if (result.rows.length > 0 && Array.isArray(result.rows[0].data)) {
                return res.json({ success: true, users: result.rows[0].data });
            }
        } catch (e) {
            console.error('Error querying users from Cloud SQL:', e.message);
        }
    }
    const dataUsersFile = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(dataUsersFile)) {
        try {
            const users = JSON.parse(fs.readFileSync(dataUsersFile, 'utf8'));
            return res.json({ success: true, users });
        } catch (e) {}
    }
    res.json({ success: true, users: [] });
});

app.post('/api/users', async (req, res) => {
    const users = req.body && req.body.users ? req.body.users : req.body;
    if (!Array.isArray(users)) {
        return res.status(400).json({ success: false, error: 'Expected array of users' });
    }
    localStore.set('users', { data: users, updated_at: new Date().toISOString() });
    persistUsersToDisk(users);
    broadcastSyncUpdate('users', users);

    const p = getPool();
    if (p) {
        try {
            await p.query(
                `INSERT INTO hms_store (key, data, updated_at)
                 VALUES ('users', $1, NOW())
                 ON CONFLICT (key) DO UPDATE
                 SET data = EXCLUDED.data, updated_at = NOW()`,
                [JSON.stringify(users)]
            );
        } catch (e) {
            console.error('Error writing users to Cloud SQL:', e.message);
        }
    }
    res.json({ success: true, count: users.length });
});

/* ── Live Cross-Device Authentication Verification API ── */
app.post('/api/auth/verify', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing credentials' });
    }
    const rawU = String(username).trim();
    const cleanU = rawU.toLowerCase();
    const cleanP = String(password).trim();
    const uDigits = cleanU.replace(/\D/g, '');

    let users = [];
    const p = getPool();
    if (p) {
        try {
            const result = await p.query("SELECT data FROM hms_store WHERE key = 'users'");
            if (result.rows.length > 0 && Array.isArray(result.rows[0].data)) {
                users = result.rows[0].data;
            }
        } catch (e) {}
    }
    if (users.length === 0) {
        const dataUsersFile = path.join(__dirname, 'data', 'users.json');
        if (fs.existsSync(dataUsersFile)) {
            try { users = JSON.parse(fs.readFileSync(dataUsersFile, 'utf8')); } catch (e) {}
        }
    }

    const matched = users.find(u => {
        if (!u) return false;
        const uName = (u.username || '').toString().trim().toLowerCase();
        const uEmpId = (u.employeeId || '').toString().trim().toLowerCase();
        const uId = (u.id || '').toString().trim().toLowerCase();
        const uEmail = (u.email || '').toString().trim().toLowerCase();
        const uPhone = (u.phone || '').toString().replace(/\D/g, '');

        const idMatch = (uName === cleanU) ||
            (uEmpId && uEmpId === cleanU) ||
            (uId === cleanU) ||
            (uEmail && uEmail === cleanU) ||
            (uDigits && uDigits.length >= 4 && (
                uId === 'usr_' + uDigits ||
                (uEmpId && uEmpId.replace(/\D/g, '') === uDigits) ||
                (uPhone && uPhone.endsWith(uDigits))
            ));
        if (!idMatch) return false;

        const storedPass = (u.password || '').toString().trim();
        return storedPass === cleanP;
    });

    if (matched) {
        return res.json({ success: true, user: matched, allUsers: users });
    }
    res.json({ success: false, message: 'Invalid username or password' });
});

/* ── Serve static files ── */
app.use(express.static(path.join(__dirname), {
    extensions: ['html', 'htm']
}));

/* ── Route root directly to index.html ── */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ═══════════════════════════════════════════════════════════════════
   WebSocket Push Notification Layer
   ═══════════════════════════════════════════════════════════════════ */

// Map: ws → { clientId, userId, role, dept, ip, connectedAt }
const clients = new Map();
let _nextId = 1;

function send(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify(obj)); } catch (e) {}
    }
}

function broadcast(obj, exclude) {
    wss.clients.forEach(function (ws) {
        if (ws !== exclude) send(ws, obj);
    });
}

function deliver(to, notification, excludeWs) {
    wss.clients.forEach(function (ws) {
        if (excludeWs && ws === excludeWs) return;
        const meta = clients.get(ws);
        if (!meta) return;

        let match = false;
        if (!to || to === 'all') {
            match = true;
        } else if (to === 'admins') {
            match = meta.role === 'admin' || meta.role === 'superAdmin' || meta.role === 'superadmin';
        } else if (to.startsWith('role:')) {
            match = meta.role === to.slice(5);
        } else if (to.startsWith('dept:')) {
            match = meta.dept === to.slice(5);
        } else if (to.startsWith('user:')) {
            match = meta.userId === to.slice(5);
        }

        if (match) send(ws, notification);
    });
}

wss.on('connection', function (ws, req) {
    const clientId = 'c' + (_nextId++);
    const ip = req.socket.remoteAddress || 'unknown';

    clients.set(ws, { clientId, userId: null, role: null, dept: null, ip, connectedAt: new Date() });
    console.log('[WS] +connect id=%s ip=%s total=%d', clientId, ip, wss.clients.size);

    // Send welcome
    send(ws, { type: 'connected', clientId });

    ws.on('message', function (raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }

        const meta = clients.get(ws);

        switch (msg.type) {
            case 'auth': {
                meta.userId = msg.userId || null;
                meta.role   = msg.role   || 'unknown';
                meta.dept   = msg.dept   || null;
                console.log('[WS] auth id=%s user=%s role=%s dept=%s', clientId, meta.userId, meta.role, meta.dept || '-');
                break;
            }

            case 'broadcast': {
                const notification = {
                    type:      'notification',
                    title:     msg.title     || 'Update',
                    body:      msg.body      || '',
                    notifType: msg.notifType || 'info',
                    key:       msg.key       || null,
                    itemId:    msg.itemId    || null,
                    timestamp: Date.now()
                };
                const exclude = msg.includeSelf ? null : ws;
                deliver(msg.to || null, notification, exclude);
                console.log('[WS] broadcast from=%s to=%s title="%s"', clientId, msg.to || 'all', notification.title);
                break;
            }

            case 'ping': {
                send(ws, { type: 'pong' });
                break;
            }

            case 'sync_push': {
                if (msg.key && msg.data !== undefined) {
                    localStore.set(msg.key, { data: msg.data, updated_at: new Date().toISOString() });
                    broadcast({ type: 'sync_update', key: msg.key, data: msg.data, ts: Date.now() }, ws);
                    if (msg.key === 'users') persistUsersToDisk(msg.data);
                    persistStoreSnapshotDebounced();
                    const p = getPool();
                    if (p) {
                        p.query(
                            `INSERT INTO hms_store (key, data, updated_at)
                             VALUES ($1, $2, NOW())
                             ON CONFLICT (key) DO UPDATE
                             SET data = EXCLUDED.data, updated_at = NOW()`,
                            [msg.key, JSON.stringify(msg.data)]
                        ).catch(err => console.error('[WS Sync] SQL error:', err.message));
                    }
                }
                break;
            }

            case 'reload': {
                broadcast({ type: 'reload' }, ws);
                break;
            }

            default:
                break;
        }
    });

    ws.on('close', function () {
        clients.delete(ws);
        console.log('[WS] -disconnect id=%s total=%d', clientId, wss.clients.size);
    });

    ws.on('error', function (err) {
        console.warn('[WS] error id=%s %s', clientId, err.message);
    });
});

/* ── Keepalive ping every 30s ── */
setInterval(function () {
    wss.clients.forEach(function (ws) {
        if (ws.readyState === WebSocket.OPEN) {
            try { ws.ping(); } catch (e) {}
        }
    });
}, 30000);

/* ── Server-side push API ── */
function pushToAll(title, body, notifType) {
    deliver('all', { type: 'notification', title, body, notifType: notifType || 'info' }, null);
}

function pushToRole(role, title, body, notifType) {
    deliver('role:' + role, { type: 'notification', title, body, notifType: notifType || 'info' }, null);
}

function pushToUser(userId, title, body, notifType) {
    deliver('user:' + userId, { type: 'notification', title, body, notifType: notifType || 'info' }, null);
}

/* ── Initialize Database Tables & Seed Snapshot ── */
async function initDb() {
    const p = getPool();
    if (!p) return;
    try {
        await p.query(`
            CREATE TABLE IF NOT EXISTS hms_store (
                key VARCHAR(128) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('[HMS Server] Database table hms_store ready ✓');
    } catch (e) {
        console.error('[HMS Server] Database init table error:', e.message);
    }
}

/* ── Start server ── */
httpServer.listen(PORT, HOST, function () {
    console.log(`[HMS] Server running on http://${HOST}:${PORT}`);
    console.log(`[HMS] WebSocket multiplexed on port ${PORT}`);
    initDb();
});

process.on('SIGINT', function () {
    console.log('\n[HMS] Shutting down...');
    wss.close(function () { process.exit(0); });
});

module.exports = { httpServer, app, wss, pushToAll, pushToRole, pushToUser };
