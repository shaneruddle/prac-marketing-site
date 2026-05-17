import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(command) {
    console.log(`Running: ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (e) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
}

// Initial Build
console.log('🏗️  Initial build...');
runCommand('npm run build');

// Start Server
console.log('📡 Starting preview server...');
runCommand('node scripts/server.js');
