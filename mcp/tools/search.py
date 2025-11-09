"""
Search tools for semantic sentiment analysis queries
"""

import sys
import os
from typing import Dict, List, Any, Optional

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_pinecone_index, generate_embedding
import config


async def search_sentiment(
    query: str,
    platform: str = "all",
    timeframe_days: Optional[int] = None,
    sentiment_filter: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Perform semantic search across customer sentiment data.

    Args:
        query: Natural language search query
        platform: Filter by platform (reddit, threads, consumer-affairs, or all)
        timeframe_days: Limit to posts from last N days (optional)
        sentiment_filter: Filter by sentiment (positive, negative, or None for all)
        limit: Maximum number of results to return

    Returns:
        Dictionary containing:
        - query: Original query string
        - filters: Applied filters
        - count: Number of results
        - matches: List of matching posts with metadata
    """

    # Generate query embedding
    query_embedding = generate_embedding(query)

    # Get Pinecone index
    index = get_pinecone_index(
        config.PINECONE_INDEX_NAME,
        config.PINECONE_API_KEY
    )

    # Build filter dictionary
    filter_dict = {}

    if platform != "all":
        filter_dict["source_platform"] = platform

    if sentiment_filter:
        if sentiment_filter.lower() == "positive":
            filter_dict["sentiment_label"] = "POSITIVE"
        elif sentiment_filter.lower() == "negative":
            filter_dict["sentiment_label"] = "NEGATIVE"

    # Add timeframe filter if specified
    if timeframe_days:
        import time
        cutoff_timestamp = time.time() - (timeframe_days * 24 * 60 * 60)
        filter_dict["timestamp"] = {"$gte": cutoff_timestamp}

    # Query Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=limit,
        include_metadata=True,
        filter=filter_dict if filter_dict else None
    )

    # Format results
    matches = []
    for match in results.matches:
        matches.append({
            "score": float(match.score),
            "text": match.metadata.get("text", ""),
            "sentiment_score": match.metadata.get("sentiment_score", 0),
            "sentiment_label": match.metadata.get("sentiment_label", "UNKNOWN"),
            "platform": match.metadata.get("source_platform", ""),
            "post_type": match.metadata.get("post_type", ""),
            "author": match.metadata.get("author", ""),
            "url": match.metadata.get("url", ""),
            "timestamp": match.metadata.get("datetime", ""),
            "upvotes": match.metadata.get("upvotes", 0),
        })

    return {
        "query": query,
        "filters": {
            "platform": platform,
            "timeframe_days": timeframe_days,
            "sentiment": sentiment_filter,
        },
        "count": len(matches),
        "matches": matches
    }
