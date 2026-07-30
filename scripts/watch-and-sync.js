const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { buildWWW, copyRecursiveSync } = require('./build-www');

const rootDir = path.join(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const androidAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

// Initial sync
console.log('🔄 Performing initial sync of base code...');
buildWWW();

if (fs.existsSync(path.join(rootDir, 'android'))) {
    try {
        copyRecursiveSync(wwwDir, androidAssetsDir);
        console.log('✅ Base code synced to Android assets.');
    } catch (e) {
        console.warn('⚠️ Could not sync to Android assets:', e.message);
    }
}

// WebSocket live reload connection
let ws = null;
function connectWS() {
    try {
        ws = new WebSocket('ws://localhost:8765');
        ws.on('open', () => {
            console.log('📡 Connected to HMS WebSocket server for live reload signals.');
        });
        ws.on('error', () => { ws = null; });
        ws.on('close', () => {
            ws = null;
            setTimeout(connectWS, 5000);
        });
    } catch (e) {
        ws = null;
    }
}
connectWS();

function notifyReload() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify({ type: 'reload' }));
            console.log('⚡ Sent live auto-reload signal to active app windows.');
        } catch (e) {}
    }
}

let debounceTimer = null;
function syncFile(relPath) {
    if (relPath.startsWith('www') || relPath.startsWith('android') || relPath.startsWith('dist') || relPath.startsWith('node_modules') || relPath.startsWith('.git')) {
        return;
    }

    const srcPath = path.join(rootDir, relPath);
    if (!fs.existsSync(srcPath)) return;

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) return;

    // Sync to www
    const destWww = path.join(wwwDir, relPath);
    const destWwwDir = path.dirname(destWww);
    if (!fs.existsSync(destWwwDir)) fs.mkdirSync(destWwwDir, { recursive: true });
    try {
        fs.copyFileSync(srcPath, destWww);
    } catch (e) {}

    // Sync to Android if exists
    if (fs.existsSync(androidAssetsDir)) {
        const destAndroid = path.join(androidAssetsDir, relPath);
        const destAndroidDir = path.dirname(destAndroid);
        if (!fs.existsSync(destAndroidDir)) fs.mkdirSync(destAndroidDir, { recursive: true });
        try {
            fs.copyFileSync(srcPath, destAndroid);
        } catch (e) {}
    }

    console.log(`[AUTO-SYNC] Base code changed (${relPath}) -> Updated in www and app assets.`);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        notifyReload();
    }, 300);
}

// Watch base files and directories
const watchTargets = ['css', 'js', 'assets'];
const watchFiles = ['index.html', 'dashboard.html', 'checklists.html', 'verify.html'];

watchFiles.forEach(file => {
    const p = path.join(rootDir, file);
    if (fs.existsSync(p)) {
        fs.watch(p, (eventType) => {
            if (eventType === 'change') syncFile(file);
        });
    }
});

function watchDirRecursive(dirRel) {
    const absDir = path.join(rootDir, dirRel);
    if (!fs.existsSync(absDir)) return;

    try {
        fs.watch(absDir, { recursive: true }, (eventType, filename) => {
            if (filename) {
                syncFile(path.join(dirRel, filename));
            }
        });
    } catch (e) {
        // Fallback for non-recursive watch if needed
    }
}

watchTargets.forEach(dir => watchDirRecursive(dir));

console.log('\n🚀 Auto-sync active! Any changes in base code (HTML, CSS, JS, Assets) will immediately update the Desktop & Mobile apps.');
