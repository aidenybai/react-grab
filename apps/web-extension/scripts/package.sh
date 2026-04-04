#!/bin/bash

set -e

echo "Building React Grab Extension..."

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
pnpm install

echo "Building extension..."
pnpm run build

echo "Creating ZIP package..."
cd dist
zip -r ../react-grab-extension.zip . -x "*.DS_Store"
cd ..

echo "Extension packaged successfully!"
echo "Package location: react-grab-extension.zip"
echo ""
echo "Next steps:"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "2. Upload react-grab-extension.zip"
echo "3. Fill in the store listing details"
echo "4. Submit for review"
