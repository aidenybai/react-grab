#!/bin/bash

# Generate Chrome extension icons from favicon.ico
# Requires ImageMagick (install with: brew install imagemagick)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FAVICON="$PROJECT_DIR/favicon.ico"
DIST_ICONS="$PROJECT_DIR/dist/icons"

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "❌ Error: ImageMagick is not installed"
    echo "Install with: brew install imagemagick"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p "$DIST_ICONS"

# Use 'magick' command (ImageMagick 7) or 'convert' (ImageMagick 6)
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
else
    CONVERT_CMD="convert"
fi

echo "📦 Generating Chrome extension icons from favicon.ico..."

# Generate icons at different sizes
for size in 16 32 48 128; do
    echo "  Creating icon-${size}.png (${size}x${size})"
    $CONVERT_CMD "$FAVICON" -resize ${size}x${size} "$DIST_ICONS/icon-${size}.png"
done

echo "✅ Icons generated successfully in dist/icons/"
ls -lh "$DIST_ICONS"
