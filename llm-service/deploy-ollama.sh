#!/bin/bash
# Deploy Ollama Nemotron server

set -e

echo "================================================"
echo "STARTING OLLAMA NEMOTRON SERVER"
echo "================================================"

# Check if Ollama is already running
if pgrep -x "ollama" > /dev/null; then
    echo "✓ Ollama already running"
else
    echo "Starting Ollama service..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
fi

# Start FastAPI wrapper
echo ""
echo "Starting FastAPI server on port 8001..."
python3 server-ollama.py &
API_PID=$!

echo ""
echo "================================================"
echo "SERVER RUNNING"
echo "================================================"
echo ""
echo "FastAPI: PID $API_PID (port 8001)"
echo "Ollama: port 11434"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:8001/v1/chat/completions \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"prompt\": \"Hello!\", \"max_tokens\": 100}'"
echo ""
echo "Stop FastAPI with:"
echo "  kill $API_PID"
echo ""
