#!/bin/bash

# FLUJO Server Deployment Script for Pre-built Artifacts
# Use this script to deploy FLUJO using pre-built artifacts from CI

set -e  # Exit on error

GITHUB_REPO="PrecisionStudioAI/FLUJO"  # Updated to the correct GitHub organization/repo
RELEASE_TAG="latest"  # Use "latest" or a specific tag like "server-build-v42"
DEPLOY_DIR="/root/FLUJO"  # Directory where FLUJO is deployed
TMP_DIR=$(mktemp -d)

echo "
FLUJO Server Deployment Script (Pre-built Artifacts)
"

# Function to clean up temporary files
cleanup() {
  echo "Cleaning up temporary files..."
  rm -rf "$TMP_DIR"
}

# Register the cleanup function on script exit
trap cleanup EXIT

# Ensure deploy directory exists
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "==== Step 1: Setting up swap space ===="
# Check if swap already exists
CURRENT_SWAP=$(free -m | awk '/^Swap:/ { print $2 }')
if [ "$CURRENT_SWAP" -lt "2048" ]; then
  echo "Less than 2GB swap detected. Setting up 4GB swap file..."
  
  # Disable existing swap if any
  if [ "$CURRENT_SWAP" -gt "0" ]; then
    sudo swapoff /swapfile
    sudo rm /swapfile
  fi
  
  # Create 4GB swap
  sudo fallocate -l 4G /swapfile
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

echo "==== Step 2: Downloading pre-built artifacts ===="
if [ "$RELEASE_TAG" = "latest" ]; then
  # Get the latest release
  echo "Finding latest release..."
  RELEASE_URL=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep "browser_download_url.*tar.gz" | cut -d '"' -f 4)
else
  # Get a specific release
  echo "Finding release with tag $RELEASE_TAG..."
  RELEASE_URL=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/tags/$RELEASE_TAG" | grep "browser_download_url.*tar.gz" | cut -d '"' -f 4)
fi

if [ -z "$RELEASE_URL" ]; then
  echo "❌ Failed to find release artifacts. Check your GitHub repository and release tag."
  exit 1
fi

echo "Downloading artifacts from: $RELEASE_URL"
curl -L "$RELEASE_URL" -o "$TMP_DIR/flujo-server-build.tar.gz"

echo "==== Step 3: Stopping current server (if running) ===="
# Try to gracefully shut down existing server
if pgrep -f "node.*headless-server.js" > /dev/null; then
  echo "Stopping existing FLUJO server..."
  if [ -f "scripts/shutdown-headless.js" ]; then
    node scripts/shutdown-headless.js || true
  else
    # If shutdown script not available, kill the process
    pkill -f "node.*headless-server.js" || true
  fi
  sleep 3
fi

echo "==== Step 4: Backing up current configuration ===="
# Backup any config files or databases if they exist
if [ -d db ]; then
  mkdir -p backup
  echo "Backing up database..."
  cp -r db backup/db_$(date +%Y%m%d_%H%M%S)
fi

echo "==== Step 5: Extracting new build ===="
# Extract the new build, preserving config files
echo "Extracting artifacts..."
mkdir -p "$TMP_DIR/extract"
tar -xzf "$TMP_DIR/flujo-server-build.tar.gz" -C "$TMP_DIR/extract"

# Copy extracted files to deployment directory
echo "Updating server files..."
# First, remove previous build files but preserve data directories
rm -rf .next
# Copy new files
cp -r "$TMP_DIR/extract/.next" .
cp -r "$TMP_DIR/extract/scripts" scripts
cp -r "$TMP_DIR/extract/public" public
cp "$TMP_DIR/extract/package.json" .
cp "$TMP_DIR/extract/next.config.ts" .

echo "==== Step 6: Installing production dependencies ===="
echo "Installing dependencies..."
npm install --production --no-optional

echo "==== Step 7: Starting headless server ===="
echo "Starting FLUJO in headless server mode with network access..."
echo "The server will be available at:"

# Get the public IP address
PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo "http://$PUBLIC_IP:4200"

# Start the server in the background
NODE_ENV=production nohup node scripts/headless-server.js --network > flujo-server.log 2>&1 &

# Save the PID to a file for easy management
echo $! > flujo-server.pid

echo "
✅ Deployment complete! 
Server is running at http://$PUBLIC_IP:4200

To view logs:
  tail -f flujo-server.log

To stop the server:
  kill $(cat flujo-server.pid)
" 