#!/usr/bin/env node

/**
 * FLUJO True Headless Server
 * 
 * This script runs FLUJO as a pure API server without Electron or UI components.
 * Ideal for deployment on low-resource servers (1GB RAM droplets).
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

// Parse command-line arguments
const argv = minimist(process.argv.slice(2), {
  boolean: ['api-only', 'network'],
  default: {
    'api-only': true,
    'network': false,
    'port': process.env.PORT || '4200'
  },
  alias: {
    n: 'network',
    a: 'api-only',
    p: 'port'
  }
});

// Default port
const port = parseInt(argv.port, 10);

// Determine if we should bind to all interfaces or just localhost
let networkMode = argv.network;

// Override with environment variable if set
if (process.env.FLUJO_NETWORK_MODE === '1' || process.env.FLUJO_NETWORK_MODE === 'true') {
  networkMode = true;
}

// Host to bind to
const hostname = networkMode ? '0.0.0.0' : 'localhost';

// Set environment variable to indicate we're in headless server mode
process.env.HEADLESS_SERVER = 'true';
process.env.SERVER_BUILD = 'true';

// Prepare the Next.js app
const app = next({
  dev: process.env.NODE_ENV !== 'production',
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // If api-only mode is enabled, only allow API routes and docs
    if (argv['api-only'] && 
        !pathname.startsWith('/api/') && 
        !pathname.startsWith('/v1/') && 
        !pathname.startsWith('/docs/') && 
        pathname !== '/favicon.ico') {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Not Found', 
        message: 'Running in API-only mode. UI is disabled.'
      }));
      return;
    }
    
    // Handle all other requests normally
    handle(req, res, parsedUrl);
  });

  // Create a status/management server on port+1
  const statusPort = port + 1;
  const statusServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // Handle status requests
    if (pathname === '/status') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'running',
        mode: 'headless-server',
        api_only: argv['api-only'],
        network_mode: networkMode,
        port: port,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        version: require('../package.json').version
      }));
      return;
    }
    
    // Handle shutdown requests
    if (pathname === '/shutdown' && req.method === 'POST') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Server shutting down' }));
      
      console.log('Shutdown requested. Closing servers...');
      
      // Close servers gracefully
      statusServer.close(() => {
        server.close(() => {
          console.log('Servers closed. Exiting process.');
          process.exit(0);
        });
      });
      
      return;
    }
    
    // 404 for other routes
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
  
  // Start the main server
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    
    const addressInfo = networkMode ? 
      `all interfaces (${hostname}) on port ${port}` : 
      `${hostname}:${port}`;
    
    console.log(`\n🚀 FLUJO Headless Server started on ${addressInfo}`);
    console.log(`📊 Status server running on port ${statusPort}`);
    
    if (argv['api-only']) {
      console.log('🔒 Running in API-only mode. UI is disabled.');
    }
    
    if (networkMode) {
      // Log the actual IP addresses for network access
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      
      console.log('\n📡 Available on:');
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip internal and non-IPv4 addresses
          if (net.family === 'IPv4' && !net.internal) {
            console.log(`   - http://${net.address}:${port}`);
          }
        }
      }
    }
    
    // Output memory usage on start
    const memUsage = process.memoryUsage();
    console.log('\n📈 Initial memory usage:');
    console.log(`   - RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
    console.log(`   - Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
    
    // Report startup success
    console.log('\n✅ Server ready! Use Ctrl+C to stop or call /shutdown endpoint to stop programmatically.');
    console.log(`   - Status: http://localhost:${statusPort}/status`);
    console.log(`   - Shutdown: POST http://localhost:${statusPort}/shutdown`);
  });
  
  // Start the status server
  statusServer.listen(statusPort, hostname, (err) => {
    if (err) {
      console.error(`Failed to start status server: ${err}`);
    }
  });
}); 