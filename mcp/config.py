#!/usr/bin/env python3
"""
Configuration for MCP server.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Pinecone Configuration
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'ttime-sentiment')

# MCP Server Configuration
MCP_SERVER_PORT = int(os.getenv('MCP_SERVER_PORT', '8000'))
MCP_SERVER_HOST = os.getenv('MCP_SERVER_HOST', '0.0.0.0')
