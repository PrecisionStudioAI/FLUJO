# FLUJO Server Deployment Guide

This guide explains how to deploy FLUJO in a server environment without Electron dependencies. This is ideal for low-resource servers like 1GB RAM droplets where installing the full Electron package can be problematic.

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