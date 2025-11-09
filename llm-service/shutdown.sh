#!/bin/bash

###############################################################################
# Nemotron-340B Shutdown Script
# Safely stops the service and saves GPU credits
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo "NEMOTRON-340B SHUTDOWN"
echo "============================================================"
echo ""

# Navigate to llm-service directory
cd "$(dirname "$0")"

echo -e "${YELLOW}Step 1: Checking service status...${NC}"
if docker ps | grep -q nemotron-340b; then
    echo -e "${GREEN}✓ Service is running${NC}"
else
    echo -e "${YELLOW}Service is already stopped${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 2: Stopping Nemotron-340B container...${NC}"
docker compose down

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Service stopped successfully${NC}"
else
    echo -e "${RED}✗ Failed to stop service${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Verifying container is stopped...${NC}"
if docker ps | grep -q nemotron-340b; then
    echo -e "${RED}✗ Container is still running${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Container stopped${NC}"
fi

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}SHUTDOWN COMPLETE!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "GPU instance is no longer consuming credits for the LLM service."
echo ""
echo -e "${YELLOW}IMPORTANT: To fully stop billing, you must:${NC}"
echo -e "${YELLOW}1. Destroy the Vultr GPU instance from the web console${NC}"
echo -e "${YELLOW}2. Or keep the instance running for future use${NC}"
echo ""
echo "To restart the service later:"
echo "  docker compose up -d"
echo ""
echo -e "${GREEN}Current instance cost: \$9.6/hour (only while instance exists)${NC}"
