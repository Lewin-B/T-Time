#!/bin/bash

###############################################################################
# Nemotron-51B Health Check and Testing Script
# Tests the vLLM deployment on Vultr A100 GPU instance
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================================"
echo "NEMOTRON-51B HEALTH CHECK"
echo "============================================================"
echo ""

# Check if service is running
echo -e "${YELLOW}[1/6] Checking Docker container status...${NC}"
if docker ps | grep -q nemotron-51b; then
    echo -e "${GREEN}✓ Container is running${NC}"
    docker ps | grep nemotron-51b
else
    echo -e "${RED}✗ Container is not running${NC}"
    echo "Start with: docker compose up -d"
    exit 1
fi

echo ""
echo -e "${YELLOW}[2/6] Checking GPU utilization...${NC}"
docker exec nemotron-51b nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ GPUs are accessible${NC}"
else
    echo -e "${RED}✗ GPU check failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[3/6] Checking vLLM health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Health endpoint responding (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Health endpoint failed (HTTP $HEALTH_RESPONSE)${NC}"
    echo "The model may still be loading. Check logs with:"
    echo "  docker compose logs -f nemotron-51b"
    exit 1
fi

echo ""
echo -e "${YELLOW}[4/6] Checking vLLM models endpoint...${NC}"
MODELS=$(curl -s http://localhost:8001/v1/models)
echo "$MODELS" | jq . 2>/dev/null || echo "$MODELS"
if echo "$MODELS" | grep -q "nvidia/Llama-3.1-Nemotron-51B-Instruct"; then
    echo -e "${GREEN}✓ Model loaded successfully${NC}"
else
    echo -e "${RED}✗ Model not loaded yet${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[5/6] Running inference test...${NC}"
START_TIME=$(date +%s.%N)

INFERENCE_RESPONSE=$(curl -s http://localhost:8001/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/Llama-3.1-Nemotron-51B-Instruct",
    "prompt": "What is the capital of France?",
    "max_tokens": 50,
    "temperature": 0.7
  }')

END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)

echo ""
echo "Response:"
echo "$INFERENCE_RESPONSE" | jq -r '.choices[0].text' 2>/dev/null || echo "$INFERENCE_RESPONSE"
echo ""
echo -e "${BLUE}Inference time: ${DURATION}s${NC}"

if echo "$INFERENCE_RESPONSE" | grep -q "Paris"; then
    echo -e "${GREEN}✓ Inference test passed (correct answer)${NC}"
elif echo "$INFERENCE_RESPONSE" | grep -q "choices"; then
    echo -e "${GREEN}✓ Inference test completed${NC}"
else
    echo -e "${RED}✗ Inference test failed${NC}"
    echo "Response: $INFERENCE_RESPONSE"
    exit 1
fi

echo ""
echo -e "${YELLOW}[6/6] Running RAG-style test (T-Mobile query)...${NC}"
START_TIME=$(date +%s.%N)

RAG_RESPONSE=$(curl -s http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/Llama-3.1-Nemotron-51B-Instruct",
    "messages": [
      {
        "role": "system",
        "content": "You are a customer service analyst. Analyze the following customer feedback."
      },
      {
        "role": "user",
        "content": "Customer feedback: \"The network coverage in downtown is terrible. I keep losing signal.\" What is the sentiment and key issue?"
      }
    ],
    "max_tokens": 100,
    "temperature": 0.3
  }')

END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)

echo ""
echo "Response:"
echo "$RAG_RESPONSE" | jq -r '.choices[0].message.content' 2>/dev/null || echo "$RAG_RESPONSE"
echo ""
echo -e "${BLUE}Chat completion time: ${DURATION}s${NC}"

if echo "$RAG_RESPONSE" | grep -q "choices"; then
    echo -e "${GREEN}✓ Chat completion test passed${NC}"
else
    echo -e "${RED}✗ Chat completion test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}ALL TESTS PASSED!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Nemotron-51B is ready for production use!"
echo ""
echo "API Endpoints:"
echo "  Health:      http://localhost:8001/health"
echo "  Models:      http://localhost:8001/v1/models"
echo "  Completions: http://localhost:8001/v1/completions"
echo "  Chat:        http://localhost:8001/v1/chat/completions"
echo ""
echo "For external access (from your client app):"
echo "  Replace 'localhost' with your GPU server IP"
echo ""
echo -e "${YELLOW}GPU Cost: \$9.6/hour - Remember to shutdown when done!${NC}"
