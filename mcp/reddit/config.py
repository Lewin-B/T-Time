#!/usr/bin/env python3
"""
Configuration for Reddit scraper.
"""

import os
import sys
from dotenv import load_dotenv

# Add parent directory to path to import shared_utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Reddit API Configuration
REDDIT_CLIENT_ID = os.getenv('REDDIT_CLIENT_ID')
REDDIT_CLIENT_SECRET = os.getenv('REDDIT_CLIENT_SECRET')
REDDIT_USER_AGENT = os.getenv('REDDIT_USER_AGENT', 'TTime-Scraper/1.0')

# Pinecone Configuration
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'ttime-sentiment')

# Scraping Configuration
TARGET_SUBREDDITS = os.getenv('TARGET_SUBREDDITS', 'tmobile').split(',')
LOOKBACK_DAYS = int(os.getenv('LOOKBACK_DAYS', '180'))

# Metadata constants
SOURCE_PLATFORM = 'reddit'
SOURCE_TYPE = 'social_media'

# Processing Configuration
RATE_LIMIT_DELAY = 2  # seconds between API calls
