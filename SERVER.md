# FLUJO Server Deployment Guide

This guide explains how to deploy FLUJO in a server environment without Electron dependencies. This is ideal for low-resource servers like 1GB RAM droplets where installing the full Electron package can be problematic.

## Server-Only Installation

For server environments, you can skip installing Electron and its dependencies altogether:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# Install dependencies without Electron
npm run install:server

# Build for production
npm run build:server

# Start the server
npm run start:server
```

## One-Step Deployment

For a simpler deployment, use the deployment script:

```bash
# Clone the repository
git clone https://github.com/yourusername/FLUJO.git
cd FLUJO

# Run the server deployment
npm run deploy:server

# Start the server
npm run start:server
```

## Network Mode

To enable network access (bind to all interfaces instead of just localhost):

```bash
npm run start:server:network
```

Or manually:

```bash
FLUJO_NETWORK_MODE=1 npm run start
```

## Environment Variables

The following environment variables control the server behavior:

- `PORT`: The port to listen on (default: 4200)
- `FLUJO_NETWORK_MODE`: Set to "1" or "true" to enable network access
- `SERVER_BUILD`: Set to "true" to indicate this is a server build without Electron

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
# Clear npm cache
npm cache clean --force

# Try the server installation
npm run install:server
```

### Server won't start

Check for port conflicts:

```bash
# Check if port 4200 is in use
lsof -i :4200

# Use a different port
PORT=4201 npm run start:server
```

### Can't access from other machines

Make sure you're running in network mode:

```bash
# Start with network mode enabled
npm run start:server:network

# Check the console output for available IP addresses
``` 