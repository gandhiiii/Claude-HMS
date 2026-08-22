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
        if (file.endsWith('.html') || file === 'sw.js') {
            const srcFile = path.join(src, file);
            const destFile = path.join(dest, file);
            fs.copyFileSync(srcFile, destFile);
        }
    });

    // Copy built React Discount module into root discount-app/ and www/discount-app/
    const discountDist = path.join(src, 'Discount', 'dist');
    const rootDiscountApp = path.join(src, 'discount-app');
    const wwwDiscountApp = path.join(dest, 'discount-app');

    if (fs.existsSync(discountDist)) {
        copyRecursiveSync(discountDist, rootDiscountApp);
        copyRecursiveSync(discountDist, wwwDiscountApp);
        console.log('✅ Discount module compiled output synced to discount-app/ and www/discount-app/.');
    }

    console.log('✅ www/ distribution directory built and synced successfully.');
}

if (require.main === module) {
    buildWWW();
}

module.exports = { buildWWW, copyRecursiveSync };
