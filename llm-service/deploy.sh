#!/bin/bash
# Deploy Nemotron-51B inference server

set -e  # Exit on error

echo "================================================"
echo "NEMOTRON-51B DEPLOYMENT"
echo "================================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Create .env with: HF_TOKEN=your_token_here"
    exit 1
fi

# Source .env (ignoring comments)
export $(grep -v '^#' .env | xargs)

# Check if HF_TOKEN is set
if [ -z "$HF_TOKEN" ]; then
    echo "ERROR: HF_TOKEN not set in .env"
    exit 1
fi

echo "✓ Environment configured"

# Stop any existing containers
echo ""
echo "Stopping existing containers..."
docker compose down

# Build the image
echo ""
echo "Building Docker image..."
docker compose build --no-cache

# Start the service
echo ""
echo "Starting Nemotron-51B service..."
docker compose up -d

# Wait for startup
echo ""
echo "Waiting for service to start..."
sleep 5

# Show logs
echo ""
echo "================================================"
echo "SERVICE LOGS"
echo "================================================"
docker logs nemotron-51b

echo ""
echo "================================================"
echo "DEPLOYMENT COMPLETE"
echo "================================================"
echo ""
echo "Service running on port 8001"
echo ""
echo "Monitor logs with:"
echo "  docker logs -f nemotron-51b"
echo ""
echo "Test the service with:"
echo "  ./test-nemotron.sh"
echo ""
echo "Stop the service with:"
echo "  docker compose down"
echo ""
