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

// Detect if we're in a server environment - added HEADLESS_SERVER flag
const isServerBuild = process.env.SERVER_BUILD === 'true';
const isHeadlessServer = process.env.HEADLESS_SERVER === 'true';
const skipElectron = process.env.INCLUDE_ELECTRON === 'false';
const forceServerMode = process.env.FORCE_SERVER_MODE === 'true';

// If any of these conditions are true, we're in a server environment
const isServerEnvironment = isServerBuild || forceServerMode || skipElectron || isHeadlessServer;

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
    
    // Check if electron-builder is installed before running postinstall:electron
    try {
      const electronBuilderPath = require.resolve('electron-builder/cli/cli.js', { paths: [process.cwd()] });
      if (electronBuilderPath) {
        console.log('Desktop environment detected. Installing Electron dependencies...');
        await runCommand('npm', ['run', 'postinstall:electron']);
      } else {
        console.log('electron-builder not found. Skipping Electron dependencies installation.');
      }
    } catch (err) {
      console.log('electron-builder not available. Skipping Electron dependencies installation.');
    }
  } catch (error) {
    console.error('Error during installation:', error);
    // Don't exit with error code - allow installation to continue without Electron
    console.log('Continuing installation without Electron dependencies.');
  }
}

// Run the main function
main(); 