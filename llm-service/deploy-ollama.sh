#!/bin/bash
# Deploy Ollama Nemotron server

set -e

echo "================================================"
echo "STARTING OLLAMA NEMOTRON SERVER"
echo "================================================"

# Start Ollama in background
echo ""
echo "Starting Ollama service..."
ollama serve > /dev/null 2>&1 &
OLLAMA_PID=$!

sleep 3

# Start FastAPI wrapper
echo ""
echo "Starting FastAPI server on port 8001..."
python3 server-ollama.py &
API_PID=$!

echo ""
echo "================================================"
echo "SERVICES RUNNING"
echo "================================================"
echo ""
echo "Ollama: PID $OLLAMA_PID (port 11434)"
echo "API: PID $API_PID (port 8001)"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:8001/v1/chat/completions \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"prompt\": \"Hello!\", \"max_tokens\": 100}'"
echo ""
echo "Stop with:"
echo "  kill $OLLAMA_PID $API_PID"
echo ""
