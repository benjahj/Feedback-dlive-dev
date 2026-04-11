#!/bin/bash
# Deploy Feedback-dLive-Dev module to Companion on Linux
# Usage: ./deploy-linux.sh [companion-usermodules-path]
#
# Default path: ~/companion-module-dev

set -e

DEST="${1:-$HOME/companion-module-dev}"
MODULE_DIR="$DEST/DliveModuleFeedbacl"
REPO="https://github.com/benjahj/Feedback-dlive-dev.git"

echo "=== Deploying Feedback-dLive-Dev module ==="
echo "Target: $MODULE_DIR"

# Create destination if needed
mkdir -p "$DEST"

# Clone or pull
if [ -d "$MODULE_DIR/.git" ]; then
    echo "Updating existing module..."
    cd "$MODULE_DIR"
    git pull
else
    echo "Cloning module..."
    git clone "$REPO" "$MODULE_DIR"
    cd "$MODULE_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build
echo "Building..."
npm run build

echo ""
echo "=== Done ==="
echo "Module installed at: $MODULE_DIR"
echo ""
echo "In Companion: Settings -> Developer modules path -> set to:"
echo "  $DEST"
echo ""
echo "Then restart Companion and add 'A&H Custom: dLive Feedback'"
