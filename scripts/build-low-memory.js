#!/usr/bin/env node

/**
 * FLUJO Low-Memory Build Script
 * 
 * Builds the application with restricted memory usage for low-resource environments.
 * This script:
 * 1. Sets NODE_OPTIONS to limit max memory
 * 2. Configures garbage collection
 * 3. Runs the build in production mode with reduced workers
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');

// Calculate available memory (in MB)
const totalMemory = Math.round(os.totalmem() / (1024 * 1024));
console.log(`\n📊 Total system memory: ${totalMemory}MB`);

// Check for swap
function getSwapSpace() {
  try {
    const swapInfo = fs.readFileSync('/proc/swaps', 'utf8');
    const lines = swapInfo.trim().split('\n').slice(1);
    
    if (lines.length === 0) {
      return 0;
    }
    
    let totalSwap = 0;
    lines.forEach(line => {
      const fields = line.trim().split(/\s+/);
      if (fields.length >= 3) {
        totalSwap += parseInt(fields[2], 10) / 1024; // Convert KB to MB
      }
    });
    
    return Math.round(totalSwap);
  } catch (err) {
    console.log('Could not read swap info:', err.message);
    return 0;
  }
}

const swapSpace = getSwapSpace();
console.log(`📊 Swap space: ${swapSpace}MB`);
const effectiveMemory = totalMemory + swapSpace;
console.log(`📊 Effective memory (RAM + swap): ${effectiveMemory}MB`);

// Set very conservative memory limits - much lower than before
// For 1GB droplet, we'll use just 384MB max for Node.js
const memoryLimit = Math.min(Math.round(totalMemory * 0.4), 384);
console.log(`🔧 Setting Node.js memory limit to: ${memoryLimit}MB`);

// Prepare environment variables with extra optimizations
const env = {
  ...process.env,
  NODE_OPTIONS: `--max-old-space-size=${memoryLimit} --expose-gc --no-warnings --max-http-header-size=8192 --use-largepages=silent`,
  NEXT_TELEMETRY_DISABLED: '1', // Disable telemetry to save resources
  HEADLESS_SERVER: 'true',
  SERVER_BUILD: 'true',
  // Reduce number of workers for webpack/babel
  NEXT_WEBPACK_WORKERS: '1',  
  NEXT_BABEL_WORKERS: '1',
  // Tell Next.js we're in a memory-constrained environment
  NEXT_MEMORY_CONSTRAINED: 'true'
};

// Function to run a command
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}\n`);
    
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
    console.log('\n=== 🏗️ FLUJO Ultra Low-Memory Build ===');
    
    // Check if swap exists, if not, suggest creating it
    if (swapSpace < 1024) {
      console.log('\n⚠️ Warning: Less than 1GB of swap detected!');
      console.log('   For reliable builds on 1GB RAM, create at least 2GB swap with:');
      console.log('   npm run setup:swap');
      
      // Pause to let the user see the message
      console.log('\n⏳ Continuing in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // First, clean the .next directory to start fresh
    console.log('\n🧹 Cleaning previous build files...');
    await runCommand('rm', ['-rf', '.next']);
    console.log('✅ Cleaned previous build files');
    
    // Trigger garbage collection if available
    if (global.gc) {
      console.log('\n🧹 Running garbage collection...');
      global.gc();
    }
    
    // Build in stages to reduce memory pressure
    console.log('\n🏗️ Starting staged production build with ultra-low memory constraints...');
    
    // We'll build using the experimental --no-mangling flag to reduce memory usage
    try {
      console.log('\n➡️ Stage 1: Running Next.js build with reduced memory usage...');
      await runCommand('next', ['build', '--no-lint']);
    } catch (error) {
      console.error('\n❌ Standard build failed, trying with more aggressive memory optimizations...');
      
      // If the normal build fails, try with more extreme memory constraints
      // This disables some optimizations but is more likely to complete
      env.NODE_OPTIONS += ' --optimize-for-size';
      
      try {
        // Retry with extreme memory optimization
        await runCommand('next', ['build', '--no-lint']);
      } catch (retryError) {
        throw new Error('Build failed even with extreme memory optimizations. Consider adding more swap space.');
      }
    }
    
    console.log('\n✅ Build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('  1. Run "npm run setup:swap" to create a 2GB swap file');
    console.log('  2. Use a VM/droplet with at least 2GB RAM');
    console.log('  3. Clean the node_modules folder and reinstall with "npm run install:headless"');
    process.exit(1);
  }
}

// Run the main function
main(); 