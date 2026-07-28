const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = path.join(__dirname, '..');
const dest = path.join(__dirname, '..', 'www');

const dirsToCopy = ['css', 'js', 'assets'];
const filesToCopy = ['index.html', 'dashboard.html'];

if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
}
fs.mkdirSync(dest, { recursive: true });

dirsToCopy.forEach(dir => {
    const srcDir = path.join(src, dir);
    const destDir = path.join(dest, dir);
    if (fs.existsSync(srcDir)) {
        execSync(`xcopy "${srcDir}" "${destDir}" /E /I /Y`, { stdio: 'inherit' });
    }
});

filesToCopy.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
    }
});

console.log('www/ built successfully');
