#!/usr/bin/env python3
"""
Configuration for PissedConsumer T-Mobile Review Scraper
"""

import os
import sys
from dotenv import load_dotenv

# Add parent directory to path to import shared utilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from parent .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Pinecone Configuration
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_INDEX_NAME = os.getenv('PINECONE_INDEX_NAME', 'ttime-sentiment')

# Source Platform Metadata
SOURCE_PLATFORM = 'pissedconsumer'
SOURCE_TYPE = 'review'

# PissedConsumer Configuration
BUSINESS_NAME = os.getenv('BUSINESS_NAME', 'T-Mobile')
BASE_URL = 'https://tmobile.pissedconsumer.com'
REVIEWS_URL = f'{BASE_URL}/review.html'

# Scraping Configuration
MAX_PAGES = 50  # Number of review pages to scrape (usually 20-30 reviews per page)
RATE_LIMIT_DELAY = 2.0  # Seconds between requests

# User Agent
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

# State file for incremental scraping
STATE_FILE = 'pissedconsumer_scrape_state.json'
