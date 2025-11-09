#!/bin/bash

###############################################################################
# Nemotron-340B Deployment Script for Vultr A100 GPU Instance
# Instance: vbm-48c-1024gb-4-a100-gpu (4x A100 80GB, 320GB VRAM)
# Cost: $9.6/hour
###############################################################################

set -e  # Exit on error

echo "============================================================"
echo "NEMOTRON-340B DEPLOYMENT SCRIPT"
echo "Target: Vultr 4x A100 GPU Instance"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: System Update${NC}"
apt-get update
apt-get upgrade -y

echo ""
echo -e "${YELLOW}Step 2: Install NVIDIA Drivers${NC}"
# Check if NVIDIA drivers are already installed
if ! command -v nvidia-smi &> /dev/null; then
    echo "Installing NVIDIA drivers..."
    apt-get install -y nvidia-driver-535
    echo -e "${GREEN}NVIDIA drivers installed. System will need reboot after script completes.${NC}"
else
    echo -e "${GREEN}NVIDIA drivers already installed${NC}"
    nvidia-smi
fi

echo ""
echo -e "${YELLOW}Step 3: Install Docker${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
    docker --version
fi

echo ""
echo -e "${YELLOW}Step 4: Install NVIDIA Container Toolkit${NC}"
if ! dpkg -l | grep -q nvidia-container-toolkit; then
    echo "Installing NVIDIA Container Toolkit..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt-get update
    apt-get install -y nvidia-container-toolkit
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker
    echo -e "${GREEN}NVIDIA Container Toolkit installed${NC}"
else
    echo -e "${GREEN}NVIDIA Container Toolkit already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Install Docker Compose${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
    docker compose version
fi

echo ""
echo -e "${YELLOW}Step 6: Configure Firewall${NC}"
# Allow SSH first to prevent lockout
ufw allow 22/tcp comment 'SSH'
# Allow LLM service port
ufw allow 8001/tcp comment 'Nemotron LLM Service'
# Enable firewall
echo "y" | ufw enable
echo -e "${GREEN}Firewall configured (SSH: 22, LLM: 8001)${NC}"

echo ""
echo -e "${YELLOW}Step 7: Verify GPU Access${NC}"
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
if [ $? -eq 0 ]; then
    echo -e "${GREEN}GPU access verified in Docker${NC}"
else
    echo -e "${RED}ERROR: GPU access in Docker failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 8: Deploy Nemotron-340B${NC}"
# Navigate to llm-service directory (assume script is run from project root)
cd llm-service

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}WARNING: No .env file found. Creating from .env.example${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env and add your HF_TOKEN if needed${NC}"
fi

# Pull vLLM image
echo "Pulling vLLM image (this may take a few minutes)..."
docker compose pull

# Start the service
echo "Starting Nemotron-340B service..."
docker compose up -d

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "Service is starting up. This will take 10-15 minutes for:"
echo "  1. Model download (~680GB for AWQ quantized version)"
echo "  2. Model loading into VRAM"
echo "  3. vLLM engine initialization"
echo ""
echo "Monitor logs with:"
echo "  docker compose logs -f nemotron-340b"
echo ""
echo "Check health status with:"
echo "  ./test-nemotron.sh"
echo ""
echo -e "${YELLOW}IMPORTANT: If you installed NVIDIA drivers for the first time,${NC}"
echo -e "${YELLOW}reboot the system now: sudo reboot${NC}"
echo ""
echo -e "${GREEN}GPU Instance Cost: \$9.6/hour${NC}"
echo -e "${YELLOW}Remember to run ./shutdown.sh when done to save credits!${NC}"
