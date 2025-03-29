# FLUJO Server Deployment Guide

This guide explains how to deploy FLUJO in a server environment without Electron dependencies. This is ideal for low-resource servers like 1GB RAM droplets where installing the full Electron package can be problematic.

## 💪 Ultra-Low-Memory Deployment (For 1GB RAM Droplets)

For extremely limited environments (1GB RAM), use our specialized deployment script:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# Run the all-in-one ultra-low-memory deployment script
npm run deploy:1gb
```

This optimized script:
1. Creates a 2GB swap file (required for building on 1GB RAM)
2. Cleans previous build artifacts
3. Installs dependencies with minimal memory usage
4. Builds the application with ultra-low memory constraints
5. Starts the headless server in network mode

**Note:** The first build on a 1GB RAM system might take longer than usual due to memory constraints.

## Deploying on Low-Memory Servers (2GB RAM)

For moderately resource-constrained environments like 2GB RAM droplets:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# One-step deployment
npm run deploy:minimal
```

This will:
1. Create a 2GB swap file to prevent out-of-memory errors
2. Install dependencies without Electron
3. Build the application with memory constraints
4. Start the headless server in network mode

### Manual Low-Memory Deployment Steps

If you prefer to run the steps individually:

```bash
# 1. Create swap file (needs sudo)
npm run setup:swap

# 2. Install dependencies (no Electron)
npm run install:headless

# 3. Build with memory constraints
npm run build:low-memory

# 4. Start the headless server
npm run headless-server:network
```

## True Headless Server Installation

For the most minimal server installation without any Electron or UI dependencies:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# Install dependencies without Electron (works on 1GB RAM droplets)
npm run install:headless

# Build the application 
npm run build:headless

# Start the headless server (API-only mode)
npm run headless-server
```

To enable network access (bind to all interfaces):

```bash
npm run headless-server:network
```

## Server-Only Installation (Alternative)

For a standard server environment that still includes the UI:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# Install dependencies without Electron
npm run install:server

# Build for production
npm run build

# Start the server
npm run start
```

## Environment Variables

The following environment variables control the server behavior:

- `PORT`: The port to listen on (default: 4200)
- `FLUJO_NETWORK_MODE`: Set to "1" or "true" to enable network access
- `HEADLESS_SERVER`: Set to "true" to indicate this is a headless server build
- `SERVER_BUILD`: Set to "true" to indicate this is a server build without Electron

## Command Line Options (Headless Server)

The headless server mode supports several command line options:

```bash
# Default (API-only, localhost only)
npm run headless-server

# With network access
npm run headless-server -- --network
# or
npm run headless-server:network

# With custom port
npm run headless-server -- --port=8080

# Allow UI access (not just API)
npm run headless-server -- --api-only=false

# All options combined
npm run headless-server -- --network --port=8080 --api-only=false
```

## Status and Management

The headless server runs a status endpoint on port+1 (default: 4201):

- Status: `GET http://localhost:4201/status`
- Shutdown: `POST http://localhost:4201/shutdown`

## Resources Usage

Without Electron dependencies, FLUJO requires significantly less resources:

- **RAM**: ~300-500MB (vs. ~1GB+ with Electron)
- **Disk Space**: ~200MB (vs. ~800MB+ with Electron)
- **CPU**: Minimal usage for serving requests

This makes it suitable for deployment on small VPS instances or containers.

## Troubleshooting

### Package installation fails

If you encounter issues during installation:

```bash
# Install with specific flags to bypass postinstall scripts
npm install --no-optional --ignore-scripts

# Install dev dependencies (needed for building)
npm install @babel/preset-env @babel/preset-typescript --no-save
```

### Build fails with "JavaScript heap out of memory"

This is common on low-memory servers (1GB RAM):

```bash
# Create a swap file (if not already done)
npm run setup:swap

# Use the ultra-low-memory build process
npm run deploy:1gb
```

### Server won't start

Check for port conflicts:

```bash
# Check if port 4200 is in use
lsof -i :4200

# Use a different port
npm run headless-server -- --port=4201
```

### Can't access from other machines

Make sure you're running in network mode:

```bash
# Start with network mode enabled
npm run headless-server:network

# Check the console output for available IP addresses
``` 