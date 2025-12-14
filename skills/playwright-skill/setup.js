#!/usr/bin/env node
const { execSync } = require('child_process');
const { isNixOS } = require('./lib/nixos');

const allBrowsers = process.argv.includes('--all-browsers');

console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit', cwd: __dirname });

if (isNixOS()) {
	console.log('NixOS detected - skipping browser install (using system browsers)');
} else {
	const browsers = allBrowsers ? 'chromium firefox webkit' : 'chromium';
	console.log(`Installing browser(s): ${browsers}...`);
	execSync(`npx playwright install ${browsers}`, { stdio: 'inherit', cwd: __dirname });
}

console.log('Setup complete!');
