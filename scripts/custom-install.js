#!/usr/bin/env node

/**
 * Custom installation script that detects the environment and conditionally runs
 * the electron-specific postinstall script.
 * 
 * In server environments, Electron dependencies will be skipped to save resources.
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Detect if we're in a server environment
const isServerBuild = process.env.SERVER_BUILD === 'true';
// A simplified check - if NODE_ENV is production and we're not explicitly requesting Electron
const isServerEnvironment = isServerBuild || 
                           (process.env.NODE_ENV === 'production' && 
                            process.env.INCLUDE_ELECTRON !== 'true');

// Get the package.json path
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      shell: process.platform === 'win32'
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
    // If we're in a server environment, skip electron-specific installation
    if (isServerEnvironment) {
      console.log('Server environment detected. Skipping Electron dependencies installation.');
      return;
    }
    
    // Otherwise, run the electron-specific postinstall script
    console.log('Desktop environment detected. Installing Electron dependencies...');
    await runCommand('npm', ['run', 'postinstall:electron']);
    
  } catch (error) {
    console.error('Error during installation:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 