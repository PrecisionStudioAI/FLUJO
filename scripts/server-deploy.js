#!/usr/bin/env node

/**
 * Server deployment script that builds and prepares the application
 * for a server environment without Electron dependencies.
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for server build
process.env.NODE_ENV = 'production';
process.env.SERVER_BUILD = 'true';

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env }
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  try {
    console.log('=== FLUJO Server Deployment ===');
    console.log('Building for server environment (no Electron)...');
    
    // Install dependencies without optional ones (skips Electron)
    console.log('\n1. Installing dependencies without Electron...');
    await runCommand('npm', ['run', 'install:server']);
    
    // Build the application for production
    console.log('\n2. Building application for production...');
    await runCommand('npm', ['run', 'build:server']);
    
    console.log('\n✅ Build completed successfully!');
    console.log('\nTo start the server, run:');
    console.log('  npm run start');
    console.log('\nTo enable network access:');
    console.log('  FLUJO_NETWORK_MODE=1 npm run start');
    
  } catch (error) {
    console.error('\n❌ Error during server deployment:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 