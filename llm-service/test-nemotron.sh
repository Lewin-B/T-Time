#!/bin/bash
# Test Nemotron-51B inference server

echo "================================================"
echo "TESTING NEMOTRON-51B SERVER"
echo "================================================"

# Test endpoint
URL="http://localhost:8001/v1/chat/completions"

echo ""
echo "Sending test request..."
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The meaning of life is",
    "max_tokens": 100,
    "temperature": 0.7
  }' | jq .

echo ""
echo "================================================"
echo "TEST COMPLETE"
echo "================================================"
