const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'frontend');
const distDir = path.join(__dirname, 'dist');

// Try to read BACKEND_URL from .env files if not already in process.env
let backendUrl = process.env.BACKEND_URL;

if (!backendUrl) {
    const envPaths = [
        path.join(__dirname, '.env'),
        path.join(__dirname, 'frontend', '.env')
    ];
    
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^BACKEND_URL=(.+)$/m);
            if (match) {
                backendUrl = match[1].trim();
                break;
            }
        }
    }
}

backendUrl = backendUrl || 'http://localhost:5000';

console.log(`Building frontend... Targeting Backend URL: ${backendUrl}`);

// Helper to copy directory recursively
function copyDirectorySync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectorySync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 1. Clean and create dist directory
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 2. Copy all frontend files to dist
copyDirectorySync(sourceDir, distDir);

// 3. Inject Environment Variables
const filesToInject = ['js/app.js', 'js/auth.js'];

filesToInject.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace the placeholder with the actual backend URL
        content = content.replace(/__BACKEND_URL__/g, backendUrl);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Injected backend URL into ${file}`);
    }
});

console.log('Frontend build complete! Output is in the /dist folder.');
