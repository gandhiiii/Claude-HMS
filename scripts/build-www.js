const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..');
const dest = path.join(__dirname, '..', 'www');

function copyRecursiveSync(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyRecursiveSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function buildWWW() {
    if (fs.existsSync(dest)) {
        try {
            fs.rmSync(dest, { recursive: true, force: true });
        } catch (e) {}
    }
    fs.mkdirSync(dest, { recursive: true });

    const dirsToCopy = ['css', 'js', 'assets'];
    dirsToCopy.forEach(dir => {
        const srcDir = path.join(src, dir);
        const destDir = path.join(dest, dir);
        if (fs.existsSync(srcDir)) {
            copyRecursiveSync(srcDir, destDir);
        }
    });

    const entries = fs.readdirSync(src);
    entries.forEach(file => {
        if (file.endsWith('.html')) {
            const srcFile = path.join(src, file);
            const destFile = path.join(dest, file);
            fs.copyFileSync(srcFile, destFile);
        }
    });

    console.log('✅ www/ distribution directory built and synced successfully.');
}

if (require.main === module) {
    buildWWW();
}

module.exports = { buildWWW, copyRecursiveSync };
