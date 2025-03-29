const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Check if we're running in Electron
const isElectron = process.versions && process.versions.hasOwnProperty('electron');

// Default port
const port = parseInt(process.env.PORT || '4200', 10);

// Determine if we should bind to all interfaces or just localhost
let networkMode = false;

// Try to read config file if running in Electron
if (isElectron) {
  try {
    const userDataPath = process.env.APPDATA || 
      (process.platform === 'darwin' ? 
        path.join(process.env.HOME, 'Library', 'Application Support') : 
        path.join(process.env.HOME, '.config'));
    
    const configPath = path.join(userDataPath, 'FLUJO', 'config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      networkMode = config.networkMode === true;
    }
  } catch (error) {
    console.error('Error reading config:', error);
  }
}

// Override with environment variable if set
// This allows server deployments to enable network mode without Electron
if (process.env.FLUJO_NETWORK_MODE === '1' || process.env.FLUJO_NETWORK_MODE === 'true') {
  networkMode = true;
}

// Host to bind to
const hostname = networkMode ? '0.0.0.0' : 'localhost';

// Prepare the Next.js app
const app = next({
  dev: process.env.NODE_ENV !== 'production',
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    
    const addressInfo = networkMode ? 
      `all interfaces (${hostname}) on port ${port}` : 
      `${hostname}:${port}`;
    
    console.log(`> Ready on ${addressInfo}`);
    
    if (networkMode) {
      // Log the actual IP addresses for network access
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      console.log('> Available on:');
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip internal and non-IPv4 addresses
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`>   http://${net.address}:${port}`);
          }
        }
      }
    }
  });
});
