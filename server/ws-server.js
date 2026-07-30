// ═══════════════════════════════════════════════════════════════════
// HMS — WebSocket Push Notification Server
// ═══════════════════════════════════════════════════════════════════
// Run:  node server/ws-server.js
// Or:   double-click Start-WS-Server.bat
//
// Clients connect from dashboard.html via WS_NOTIFY (ws-notifications.js).
// Each client sends an { type:"auth", userId, role, dept } on connect.
// Server can then push targeted notifications to any client or group.
//
// Message types handled:
//   Client → Server:
//     { type:"auth",      userId, role, dept }          — identify this socket
//     { type:"broadcast", to, title, body, notifType }  — fan-out to others
//     { type:"ping" }                                    — keepalive
//
//   Server → Client:
//     { type:"notification", title, body, notifType }   — push to WS_NOTIFY
//     { type:"pong" }                                    — keepalive reply
//     { type:"connected", clientId }                     — welcome message
// ═══════════════════════════════════════════════════════════════════

'use strict';

const WebSocket = require('ws');
const http      = require('http');

const PORT = process.env.HMS_WS_PORT || 8765;
const HOST = process.env.HMS_WS_HOST || '0.0.0.0';

/* ── HTTP server (health check at GET /) ── */
const httpServer = http.createServer(function (req, res) {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status:  'ok',
            service: 'HMS WebSocket Notification Server',
            clients: wss ? wss.clients.size : 0,
            uptime:  Math.floor(process.uptime()) + 's'
        }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server: httpServer });

/* ── Client registry ── */
// Map: ws → { clientId, userId, role, dept, connectedAt }
const clients = new Map();
let _nextId = 1;

/* ── Helpers ── */
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

/**
 * Target delivery based on `to` field:
 *   "all"              → every connected client
 *   "admins"           → clients with role === "admin" or isSuperAdmin
 *   "role:<roleName>"  → clients matching that role
 *   "dept:<deptName>"  → clients in that department
 *   "user:<userId>"    → a specific user
 *   (omitted / null)   → every client except sender
 */
function deliver(to, notification, excludeWs) {
    wss.clients.forEach(function (ws) {
        if (ws === excludeWs) return;
        const meta = clients.get(ws);
        if (!meta) return;

        let match = false;
        if (!to || to === 'all') {
            match = true;
        } else if (to === 'admins') {
            match = meta.role === 'admin' || meta.role === 'superAdmin';
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

/* ── Connection handler ── */
wss.on('connection', function (ws, req) {
    const clientId = 'c' + (_nextId++);
    const ip = req.socket.remoteAddress || 'unknown';

    clients.set(ws, { clientId, userId: null, role: null, dept: null, ip, connectedAt: new Date() });
    console.log('[WS] +connect  id=%s  ip=%s  total=%d', clientId, ip, wss.clients.size);

    // Send welcome
    send(ws, { type: 'connected', clientId });

    /* ── Message handler ── */
    ws.on('message', function (raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }

        const meta = clients.get(ws);

        switch (msg.type) {

            // ── Auth: client identifies itself ──────────────────────
            case 'auth': {
                meta.userId = msg.userId || null;
                meta.role   = msg.role   || 'unknown';
                meta.dept   = msg.dept   || null;
                console.log('[WS]  auth     id=%s  user=%s  role=%s  dept=%s',
                    clientId, meta.userId, meta.role, meta.dept || '-');
                break;
            }

            // ── Broadcast: one client pushes a notification to others ─
            case 'broadcast': {
                const notification = {
                    type:       'notification',
                    title:      msg.title      || 'Update',
                    body:       msg.body       || '',
                    notifType:  msg.notifType  || 'info'
                };
                deliver(msg.to || null, notification, ws);
                console.log('[WS]  broadcast from=%s  to=%s  title="%s"',
                    clientId, msg.to || 'all', notification.title);
                break;
            }

            // ── Ping / keepalive ─────────────────────────────────────
            case 'ping': {
                send(ws, { type: 'pong' });
                break;
            }

            // ── Live Code Reload Signal ──────────────────────────────
            case 'reload': {
                broadcast({ type: 'reload' }, ws);
                console.log('[WS]  reload signal broadcasted to all connected clients');
                break;
            }

            default:
                break;
        }
    });

    /* ── Disconnect handler ── */
    ws.on('close', function () {
        clients.delete(ws);
        console.log('[WS] -disconnect  id=%s  total=%d', clientId, wss.clients.size);
    });

    ws.on('error', function (err) {
        console.warn('[WS]  error  id=%s  %s', clientId, err.message);
    });
});

/* ── Server-side push API (call from this process if needed) ── */
function pushToAll(title, body, notifType) {
    broadcast({ type: 'notification', title, body, notifType: notifType || 'info' });
}

function pushToRole(role, title, body, notifType) {
    deliver('role:' + role, { type: 'notification', title, body, notifType: notifType || 'info' }, null);
}

function pushToUser(userId, title, body, notifType) {
    deliver('user:' + userId, { type: 'notification', title, body, notifType: notifType || 'info' }, null);
}

/* ── Keepalive ping every 30 s (prevents idle disconnects) ── */
setInterval(function () {
    wss.clients.forEach(function (ws) {
        if (ws.readyState === WebSocket.OPEN) {
            try { ws.ping(); } catch (e) {}
        }
    });
}, 30000);

/* ── Start listening ── */
httpServer.listen(PORT, HOST, function () {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   HMS WebSocket Notification Server               ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║   WS   →  ws://localhost:' + PORT + '                  ║');
    console.log('║   HTTP →  http://localhost:' + PORT + '/health          ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});

/* ── Graceful shutdown ── */
process.on('SIGINT', function () {
    console.log('\n[WS] Shutting down...');
    wss.close(function () { process.exit(0); });
});

module.exports = { pushToAll, pushToRole, pushToUser };
