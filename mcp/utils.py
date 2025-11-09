#!/usr/bin/env python3
"""
Shared utilities for all T-Time scrapers.

Contains common functions for:
- ML model initialization (sentiment analysis, embeddings)
- Pinecone operations
- Logging setup
"""

import os
import json
import time
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

import torch
import torch.nn.functional as F
from transformers import pipeline, AutoTokenizer, AutoModel
from pinecone import Pinecone

# Global singletons for models
sentiment_analyzer = None
embedding_model = None
embedding_tokenizer = None
pinecone_client = None

# Model constants (shared across all scrapers)
SENTIMENT_MODEL = 'distilbert-base-uncased-finetuned-sst-2-english'
EMBEDDING_MODEL = 'intfloat/e5-base-v2'  # 768 dimensions
BATCH_SIZE = 96  # Max records per Pinecone batch


# ============================================================================
# Model Initialization
# ============================================================================

def init_sentiment_analyzer():
    """Initialize the sentiment analysis pipeline."""
    global sentiment_analyzer
    if sentiment_analyzer is None:
        print("Loading sentiment analysis model...")
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model=SENTIMENT_MODEL,
            device=0 if torch.cuda.is_available() else -1
        )
    return sentiment_analyzer


def init_embedding_model():
    """Initialize the embedding model."""
    global embedding_model, embedding_tokenizer
    if embedding_model is None:
        print("Loading embedding model...")
        embedding_tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL)
        embedding_model = AutoModel.from_pretrained(EMBEDDING_MODEL)
        if torch.cuda.is_available():
            embedding_model = embedding_model.to('cuda')
    return embedding_model, embedding_tokenizer


def init_pinecone(api_key: str):
    """
    Initialize Pinecone client.

    Args:
        api_key: Pinecone API key
    """
    global pinecone_client
    if pinecone_client is None:
        print("Initializing Pinecone client...")
        pinecone_client = Pinecone(api_key=api_key)
    return pinecone_client


def get_pinecone_index(index_name: str, api_key: str):
    """
    Get a Pinecone index object.

    Args:
        index_name: Name of the Pinecone index
        api_key: Pinecone API key

    Returns:
        Pinecone Index object
    """
    pc = init_pinecone(api_key)
    return pc.Index(index_name)


# ============================================================================
# Sentiment Analysis
# ============================================================================

def mean_pooling(model_output, attention_mask):
    """Mean pooling for sentence embeddings."""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Analyze sentiment of text.

    Args:
        text: Input text to analyze

    Returns:
        Dictionary with sentiment label and score
    """
    analyzer = init_sentiment_analyzer()

    # Truncate text if too long (model limit is 512 tokens)
    if len(text) > 500:
        text = text[:500]

    result = analyzer(text)[0]

    return {
        'label': result['label'],  # POSITIVE or NEGATIVE
        'score': result['score'],  # Confidence score
        'sentiment_value': result['score'] if result['label'] == 'POSITIVE' else -result['score']
    }


# ============================================================================
# Embeddings
# ============================================================================

def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for text.

    Args:
        text: Input text to embed

    Returns:
        List of floats representing the embedding vector
    """
    model, tokenizer = init_embedding_model()

    # Tokenize and encode
    encoded_input = tokenizer(
        text,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors='pt'
    )

    # Move to GPU if available
    if torch.cuda.is_available():
        encoded_input = {k: v.to('cuda') for k, v in encoded_input.items()}

    # Generate embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)

    # Apply mean pooling
    embeddings = mean_pooling(model_output, encoded_input['attention_mask'])

    # Normalize embeddings
    embeddings = F.normalize(embeddings, p=2, dim=1)

    return embeddings[0].cpu().tolist()


# ============================================================================
# Pinecone Operations
# ============================================================================

def upsert_to_pinecone(
    index_name: str,
    vectors: List[Dict[str, Any]],
    api_key: str,
    namespace: str = "",
    batch_size: int = None
) -> None:
    """
    Upsert vectors to Pinecone.

    Args:
        index_name: Name of the Pinecone index
        vectors: List of vector dictionaries with 'id', 'values', and 'metadata'
        api_key: Pinecone API key
        namespace: Optional namespace for organization
        batch_size: Optional batch size override
    """
    pc = init_pinecone(api_key)
    index = pc.Index(index_name)

    # Use default batch size if not specified
    if batch_size is None:
        batch_size = BATCH_SIZE

    # Upsert in batches (max 96 records per batch per Pinecone docs)
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch, namespace=namespace)
        time.sleep(0.5)  # Rate limiting

    print(f"Upserted {len(vectors)} vectors to Pinecone")


def generate_vector_id(source_identifier: str, source_platform: str) -> str:
    """
    Generate a unique vector ID for deduplication.

    Args:
        source_identifier: Unique identifier from source platform
        source_platform: Platform name (reddit, threads, consumer-affairs)

    Returns:
        Unique vector ID (MD5 hash)
    """
    combined = f"{source_platform}_{source_identifier}"
    return hashlib.md5(combined.encode()).hexdigest()


def check_if_exists(index_name: str, vector_ids: List[str], api_key: str, namespace: str = "") -> List[str]:
    """
    Check which vector IDs already exist in Pinecone.

    Args:
        index_name: Name of the Pinecone index
        vector_ids: List of vector IDs to check
        api_key: Pinecone API key
        namespace: Optional namespace

    Returns:
        List of existing vector IDs
    """
    pc = init_pinecone(api_key)
    index = pc.Index(index_name)

    existing = []
    batch_size = 100

    for i in range(0, len(vector_ids), batch_size):
        batch = vector_ids[i:i + batch_size]
        try:
            fetch_result = index.fetch(ids=batch, namespace=namespace)
            existing.extend(fetch_result.vectors.keys())
        except Exception as e:
            print(f"Error checking existence: {e}")
            continue

    return existing


# ============================================================================
# State Management
# ============================================================================

def load_state(state_file: str) -> Dict[str, Any]:
    """
    Load state from JSON file.

    Args:
        state_file: Path to state file

    Returns:
        Dictionary with state data (empty dict if file doesn't exist)
    """
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading state file: {e}")
            return {}
    return {}


def save_state(state_file: str, state: Dict[str, Any]) -> bool:
    """
    Save state to JSON file.

    Args:
        state_file: Path to state file
        state: Dictionary with state data

    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(state_file) if os.path.dirname(state_file) else '.', exist_ok=True)
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving state file: {e}")
        return False


def save_json_file(file_path: str, data: Any) -> bool:
    """
    Save data to JSON file.

    Args:
        file_path: Path to output file
        data: Data to save (must be JSON serializable)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else '.', exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving JSON file: {e}")
        return False


def format_json(data: Any, indent: int = 2) -> str:
    """
    Format data as pretty-printed JSON string.

    Args:
        data: Data to format
        indent: Indentation level

    Returns:
        Formatted JSON string
    """
    return json.dumps(data, indent=indent, ensure_ascii=False)


# ============================================================================
# Data Processing and Upload
# ============================================================================

def process_and_upload_to_pinecone(
    data_items: List[Dict[str, Any]],
    source_platform: str,
    index_name: str,
    api_key: str,
    metadata_creator_func,
    logger: Optional[logging.Logger] = None
) -> int:
    """
    Generic function to process data items and upload to Pinecone.
    
    Args:
        data_items: List of data dictionaries with 'id', 'text', and 'sentiment' keys
        source_platform: Platform name (reddit, consumer-affairs, etc.)
        index_name: Pinecone index name
        api_key: Pinecone API key
        metadata_creator_func: Function that takes an item dict and returns metadata dict
        logger: Optional logger instance
    
    Returns:
        Number of vectors successfully uploaded
    """
    if not data_items:
        if logger:
            logger.info("No new items to process")
        return 0

    if logger:
        logger.info(f"\nProcessing and uploading {len(data_items)} items...")

    # Check for existing items to avoid duplicates
    vector_ids = [generate_vector_id(item['id'], source_platform) for item in data_items]
    existing_ids = check_if_exists(index_name, vector_ids, api_key)

    if existing_ids:
        if logger:
            logger.info(f"Found {len(existing_ids)} existing items, will skip those")

    existing_ids_set = set(existing_ids)
    new_items = [
        item for item in data_items
        if generate_vector_id(item['id'], source_platform) not in existing_ids_set
    ]

    if not new_items:
        if logger:
            logger.info("All items already exist in database")
        return 0

    if logger:
        logger.info(f"Processing {len(new_items)} new items...")

    vectors = []
    error_count = 0

    # Import tqdm if available, otherwise use plain iteration
    try:
        from tqdm import tqdm
        items_iter = tqdm(new_items, desc="Generating embeddings")
    except ImportError:
        items_iter = new_items

    for item in items_iter:
        try:
            # Generate embedding
            embedding = generate_embedding(item['text'])

            vector_id = generate_vector_id(item['id'], source_platform)

            # Use the provided metadata creator function
            metadata = metadata_creator_func(item)

            # Add text content to metadata (truncated)
            metadata['text'] = item['text'][:1000]

            vectors.append({
                'id': vector_id,
                'values': embedding,
                'metadata': metadata
            })

        except Exception as e:
            if logger:
                logger.error(f"Error processing item {item['id']}: {e}")
            error_count += 1
            continue

    # Upload to Pinecone
    if vectors:
        upsert_to_pinecone(
            index_name=index_name,
            vectors=vectors,
            api_key=api_key
        )
        if logger:
            logger.info(f"\nSuccessfully processed and uploaded {len(vectors)} items")
        return len(vectors)
    else:
        if logger:
            logger.warning("\nNo vectors to upload")
        return 0


# ============================================================================
# Logging
# ============================================================================

def setup_logger(name: str = "scraper") -> logging.Logger:
    """
    Set up logger with console output.

    Args:
        name: Logger name

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Remove existing handlers to avoid duplicates
    logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Format: [2024-01-15 10:30:45] Message
    formatter = logging.Formatter('[%(asctime)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    return logger


def log_post_processing(logger: logging.Logger, post_data: Dict[str, Any], comment_count: int):
    """
    Log details about a post being processed.

    Args:
        logger: Logger instance
        post_data: Post data dictionary
        comment_count: Number of comments/replies collected
    """
    sentiment_emoji = "✓" if post_data['sentiment']['label'] == 'POSITIVE' else "✗"
    sentiment_score = post_data['sentiment']['sentiment_value']

    # Handle both title (Reddit) and text (Threads/Reviews)
    display_text = post_data.get('title', post_data.get('text', ''))[:60]
    if len(post_data.get('title', post_data.get('text', ''))) > 60:
        display_text += "..."

    logger.info(f"Processing: \"{display_text}\"")
    logger.info(f"├─ ID: {post_data['id']} | Upvotes: {post_data.get('upvotes', 0)} | Comments: {comment_count}")
    logger.info(f"└─ Sentiment: {post_data['sentiment']['label']} ({sentiment_score:+.2f}) {sentiment_emoji}")


# ============================================================================
# Utility Functions
# ============================================================================

def retry_on_failure(func, max_retries: int = 3, delay: int = 2):
    """
    Retry a function on failure.

    Args:
        func: Function to retry
        max_retries: Maximum number of retries
        delay: Delay between retries in seconds

    Returns:
        Function result or None if all retries fail
    """
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"All {max_retries} attempts failed: {e}")
                return None
