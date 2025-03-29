#!/bin/bash

# Script to create a swap file for memory-constrained environments

# Size of swap file in MB (adjust as needed)
SWAP_SIZE=2048

echo "Creating $SWAP_SIZE MB swap file..."
# Create a swap file
sudo fallocate -l ${SWAP_SIZE}M /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Check if swap is active
echo "Swap status:"
sudo swapon --show

# Add to fstab to persist across reboots
if ! grep -q "/swapfile" /etc/fstab; then
  echo "Adding swap to /etc/fstab for persistence across reboots"
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
else
  echo "Swap already in /etc/fstab"
fi

echo "Swap file created successfully!" 