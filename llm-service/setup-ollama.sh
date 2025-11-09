#!/bin/bash
# Install and setup Ollama with Nemotron-70B

set -e

echo "================================================"
echo "OLLAMA + NEMOTRON SETUP"
echo "================================================"

# Install Ollama
echo ""
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Pull Nemotron 70B
echo ""
echo "Pulling Nemotron-70B model (this will take 10-15 minutes)..."
ollama pull nemotron

echo ""
echo "================================================"
echo "SETUP COMPLETE"
echo "================================================"
echo ""
echo "Nemotron-70B is ready!"
echo ""
echo "Start the server with:"
echo "  ollama serve"
echo ""
echo "Or run interactively:"
echo "  ollama run nemotron"
echo ""
