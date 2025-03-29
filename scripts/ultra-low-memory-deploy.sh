#!/bin/bash

# FLUJO Ultra-Low-Memory Deployment Script
# For 1GB RAM droplets and other memory-constrained environments

echo "
FLUJO Ultra-Low-Memory Deployment Script
"

echo "==== Step 1: Setting up swap space ===="
# Check if swap already exists
CURRENT_SWAP=$(free -m | awk '/^Swap:/ { print $2 }')
if [ "$CURRENT_SWAP" -lt "1024" ]; then
  echo "Less than 1GB swap detected. Setting up 2GB swap file..."
  
  # Create 2GB swap
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  
  # Add to fstab if not already there
  if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
  fi
  
  # Show new swap status
  echo "New swap status:"
  free -h
else
  echo "Sufficient swap already exists ($CURRENT_SWAP MB). Continuing..."
fi

echo "==== Step 2: Clean environment ===="
echo "Cleaning previous build artifacts..."
rm -rf .next

echo "==== Step 3: Installing dependencies ===="
echo "Installing only required dependencies (no Electron)..."
HEADLESS_SERVER=true FORCE_SERVER_MODE=true npm install --production=false --no-optional --no-fund

echo "==== Step 4: Building with ultra-low memory settings ===="
echo "Starting build process with memory constraints..."
node scripts/build-low-memory.js

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please check the logs above for errors."
  exit 1
fi

echo "==== Step 5: Starting headless server ===="
echo "Starting FLUJO in headless server mode with network access..."
echo "The server will be available at:"

# Get the public IP address
PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo "http://$PUBLIC_IP:4200"

# Start the server
NODE_ENV=production node scripts/headless-server.js --network

echo "
✅ Deployment complete! 
Server is now running at http://$PUBLIC_IP:4200

Press Ctrl+C to stop the server.
" 