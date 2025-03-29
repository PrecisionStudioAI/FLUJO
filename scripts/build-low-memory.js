#!/usr/bin/env node

/**
 * FLUJO Low-Memory Build Script
 * 
 * Builds the application with restricted memory usage for low-resource environments.
 * This script:
 * 1. Sets NODE_OPTIONS to limit max memory
 * 2. Configures garbage collection
 * 3. Runs the build in production mode
 */

const { spawn } = require('child_process');
const os = require('os');

// Calculate available memory (in MB)
const totalMemory = Math.round(os.totalmem() / (1024 * 1024));
console.log(`Total system memory: ${totalMemory}MB`);

// Set memory limit to 75% of total available memory or 512MB, whichever is lower
const memoryLimit = Math.min(Math.round(totalMemory * 0.75), 512);
console.log(`Setting Node.js memory limit to: ${memoryLimit}MB`);

// Prepare environment variables
const env = {
  ...process.env,
  NODE_OPTIONS: `--max-old-space-size=${memoryLimit} --expose-gc`,
  NEXT_TELEMETRY_DISABLED: '1', // Disable telemetry to save resources
  HEADLESS_SERVER: 'true',
  SERVER_BUILD: 'true'
};

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning: ${command} ${args.join(' ')}\n`);
    
    const child = spawn(command, args, { 
      stdio: 'inherit',
      env,
      shell: true
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
    console.log('=== FLUJO Low-Memory Build ===');
    
    // First, clean the .next directory to start fresh
    await runCommand('rm', ['-rf', '.next']);
    console.log('Cleaned previous build files');
    
    // Then run the Next.js build with memory constraints
    console.log('\nStarting production build with memory constraints...');
    await runCommand('next', ['build']);
    
    console.log('\n✅ Build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 