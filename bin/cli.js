#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Root of the package (parent folder of bin/)
const appPath = path.join(__dirname, '..');

let electronPath;
try {
  electronPath = require('electron');
} catch (err) {
  console.error('Error: Electron is not installed.');
  console.error('Please make sure Electron is installed:');
  console.error('  npm install -g electron');
  process.exit(1);
}

// Spawn electron process pointing to the app directory
const child = spawn(electronPath, [appPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('error', (err) => {
  console.error('Failed to start Electron:', err);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});
