
#!/bin/bash

# Production build script for SSL Certificate Generator

set -e

echo "Building SSL Certificate Generator for production..."

# Clean previous builds
rm -rf dist
rm -rf server/node_modules

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm ci

# Build frontend
echo "Building frontend application..."
npm run build

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm ci --only=production

cd ..

echo "Production build completed successfully!"
echo "Files ready for deployment:"
echo "- Frontend: ./dist/"
echo "- Backend: ./server/"
