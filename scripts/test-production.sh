
#!/bin/bash

# Production testing script

set -e

echo "Testing production deployment locally..."

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Frontend build not found. Running build..."
    ./scripts/build-production.sh
fi

# Start server in production mode
cd server
NODE_ENV=production ACME_ENV=staging npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "Testing health endpoint..."
curl -f http://localhost:3001/health || {
    echo "Health check failed!"
    kill $SERVER_PID
    exit 1
}

echo "Health check passed!"

# Test frontend serving
echo "Testing frontend serving..."
curl -f http://localhost:3001/ > /dev/null || {
    echo "Frontend serving failed!"
    kill $SERVER_PID
    exit 1
}

echo "Frontend serving works!"

# Clean up
kill $SERVER_PID

echo "All tests passed! Ready for production deployment."
