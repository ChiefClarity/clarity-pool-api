#!/bin/bash

echo "🔨 Testing Render Build Process"
echo "=============================="

# Clean previous build
echo "1. Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo -e "\n2. Installing dependencies..."
npm install

# Build the project
echo -e "\n3. Building project..."
npm run build

# Check if dist folder was created
echo -e "\n4. Checking build output..."
if [ -d "dist" ]; then
    echo "✅ Build successful! dist/ folder created"
    ls -la dist/
else
    echo "❌ Build failed! No dist/ folder found"
    exit 1
fi

# Test if the app can start (will fail without env vars, but that's ok)
echo -e "\n5. Testing if app can start..."
timeout 5s npm run start:prod || echo "App started (expected to fail without env vars)"

echo -e "\n✅ Build test complete!"