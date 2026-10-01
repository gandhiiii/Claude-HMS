// ═══════════════════════════════════════════════════════════════════
// Stavya Intelligence HMS — Web & WebSocket Server
// ═══════════════════════════════════════════════════════════════════

'use strict';

const express   = require('express');
const http      = require('http');
const path      = require('path');
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

/* ── Cloud SQL Database Sync API ── */
app.get('/api/db/status', async (req, res) => {
    const p = getPool();
    if (!p) {
        return res.json({ configured: false, provider: 'None (Local / Standby)' });
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
    if (!p) return res.json({ connected: false, data: [] });
    try {
        const result = await p.query('SELECT key, data, updated_at FROM hms_store');
        res.json({ connected: true, data: result.rows });
    } catch (e) {
        console.error('Cloud SQL sync read error:', e.message);
        res.status(500).json({ error: 'Failed to fetch from Cloud SQL' });
    }
});

app.post('/api/db/sync', async (req, res) => {
    const p = getPool();
    if (!p) return res.status(503).json({ error: 'Cloud SQL not configured' });
    try {
        const { key, data, items } = req.body;
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
        res.status(500).json({ error: 'Failed to write to Cloud SQL' });
    }
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

/* ── Start server ── */
httpServer.listen(PORT, HOST, function () {
    console.log(`[HMS] Server running on http://${HOST}:${PORT}`);
    console.log(`[HMS] WebSocket multiplexed on port ${PORT}`);
});

process.on('SIGINT', function () {
    console.log('\n[HMS] Shutting down...');
    wss.close(function () { process.exit(0); });
});

module.exports = { httpServer, app, wss, pushToAll, pushToRole, pushToUser };
