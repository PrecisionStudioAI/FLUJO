# FLUJO CI-Based Deployment Guide

This guide explains how to deploy FLUJO to low-memory servers (like 1GB RAM droplets) using a CI/CD pipeline to handle the resource-intensive build process.

## Overview

Instead of building the application directly on a low-memory server, which often leads to "JavaScript heap out of memory" errors, this approach:

1. Uses GitHub Actions to build the application on a more powerful CI runner
2. Creates a release with the pre-built artifacts
3. Allows the server to download and deploy these artifacts without having to build them

## GitHub Actions Workflow

The workflow is defined in `.github/workflows/build.yml` and consists of two jobs:

1. **Build Job**: Installs dependencies and builds the application without Electron
2. **Create Release Job**: Packages the built artifacts and creates a GitHub release

The workflow runs automatically on pushes to the `feature/server` branch or can be triggered manually.

## How to Setup

### 1. Push the Configuration Files

Ensure the following files are in your repository under the `feature/server` branch:

- `.github/workflows/build.yml` - GitHub Actions workflow
- `scripts/deploy-server-from-artifact.sh` - Deployment script

### 2. Configure GitHub Repository

- Ensure your repository has the appropriate permissions to create releases
- If you're using a private repository, you'll need to generate a personal access token with appropriate permissions

### 3. Initial Setup on Your Server

```bash
# Clone the repository
git clone https://github.com/PrecisionStudioAI/FLUJO.git
cd FLUJO

# Make the deployment script executable
chmod +x scripts/deploy-server-from-artifact.sh
```

## Deployment Process

### Option 1: Using the Deployment Script

The easiest way to deploy is using the provided script:

```bash
# Deploy using the latest release
npm run deploy:from-artifacts

# Or run the script directly with a specific version
RELEASE_TAG="server-build-v42" bash scripts/deploy-server-from-artifact.sh
```

This script will:
1. Set up a 4GB swap file (if needed)
2. Download the latest (or specified) release artifacts
3. Stop any running FLUJO server
4. Backup existing database files
5. Extract and install the new version
6. Start the server in headless mode

### Option 2: Manual Deployment

If you prefer to perform the steps manually:

```bash
# 1. Set up swap space (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 2. Download the latest release
# Get the latest release URL (requires jq)
RELEASE_URL=$(curl -s "https://api.github.com/repos/PrecisionStudioAI/FLUJO/releases/latest" | jq -r '.assets[0].browser_download_url')
curl -L "$RELEASE_URL" -o flujo-server-build.tar.gz

# 3. Extract the build
mkdir -p flujo-extract
tar -xzf flujo-server-build.tar.gz -C flujo-extract

# 4. Stop existing server (if running)
pkill -f "node.*headless-server.js" || true

# 5. Update server files
cp -r flujo-extract/.next .
cp -r flujo-extract/scripts scripts
cp -r flujo-extract/public public
cp flujo-extract/package.json .
cp flujo-extract/next.config.ts .

# 6. Install dependencies
npm install --production --no-optional

# 7. Start the server
NODE_ENV=production nohup node scripts/headless-server.js --network > flujo-server.log 2>&1 &
```

## Troubleshooting

### Cannot Find Release Artifacts

If the script fails to find the release artifacts, check:

1. Your GitHub repository is correctly set to `PrecisionStudioAI/FLUJO`
2. The GitHub Actions workflow has run successfully
3. The repository has releases with the expected assets

You can check available releases at: https://github.com/PrecisionStudioAI/FLUJO/releases

### Server Doesn't Start

Check the server logs for errors:

```bash
tail -f flujo-server.log
```

### Out of Memory During Dependency Installation

Even though we're not building the application on the server, installing dependencies can still be memory-intensive. If you encounter memory issues:

```bash
# Increase swap space further
sudo swapoff /swapfile
sudo rm /swapfile
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Updating to a New Version

When a new version is available:

```bash
# Simply run the deployment script again
npm run deploy:from-artifacts

# Or specify a specific version
RELEASE_TAG="server-build-v45" npm run deploy:from-artifacts
```

## Benefits of This Approach

- **No Build Memory Issues**: The resource-intensive build process happens on CI servers
- **Faster Deployment**: Installing pre-built artifacts is much faster than building
- **Minimal Server Requirements**: Works on the smallest VPS instances (1GB RAM)
- **Automated**: New builds are created automatically when changes are pushed 