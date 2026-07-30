const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let server;

function startLocalServer(webDir, onReady) {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wasm': 'application/wasm',
        '.ttf': 'font/ttf',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
    };

    server = http.createServer((req, res) => {
        let reqUrl = req.url.split('?')[0];
        if (reqUrl === '/') reqUrl = '/index.html';

        const filePath = path.join(webDir, reqUrl);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                const indexPath = path.join(webDir, 'index.html');
                fs.readFile(indexPath, (idxErr, idxData) => {
                    if (idxErr) {
                        res.writeHead(404);
                        res.end('File Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(idxData);
                    }
                });
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    });

    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        console.log(`HMS Local Server running on http://127.0.0.1:${port}`);
        onReady(port);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 900,
        minHeight: 600,
        title: "Stavya Intelligence HMS",
        icon: path.join(__dirname, '..', 'assets', 'stavya-logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const wwwDir = path.join(__dirname, '..', 'www');
    const htmlDir = path.join(__dirname, '..');

    const webDir = fs.existsSync(path.join(wwwDir, 'index.html')) ? wwwDir : htmlDir;

    startLocalServer(webDir, (port) => {
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
    });

    // Auto-reload Electron window on base code change
    let reloadTimer = null;
    function watchForChanges(itemPath) {
        if (!fs.existsSync(itemPath)) return;
        try {
            fs.watch(itemPath, { recursive: true }, (evt, filename) => {
                clearTimeout(reloadTimer);
                reloadTimer = setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        console.log('[ELECTRON] Base code update detected (' + filename + ') -> reloading window...');
                        mainWindow.reload();
                    }
                }, 300);
            });
        } catch (e) {}
    }

    ['css', 'js', 'assets', 'index.html', 'dashboard.html', 'checklists.html', 'verify.html'].forEach(item => {
        watchForChanges(path.join(htmlDir, item));
    });

    Menu.setApplicationMenu(null);

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (server) server.close();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (server) server.close();
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
