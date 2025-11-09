"""
Data fetching tools for retrieving recent posts and comments
"""

import sys
import os
from typing import Dict, List, Any, Optional
import time

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_pinecone_index
import config


async def fetch_recent_posts(
    platform: str = "all",
    sentiment: str = "all",
    timeframe_days: int = 7,
    post_type: Optional[str] = None,
    limit: int = 20,
    sort_by: str = "timestamp"
) -> Dict[str, Any]:
    """
    Fetch recent posts with optional filtering.

    Args:
        platform: Filter by platform (reddit, threads, consumer-affairs, or all)
        sentiment: Filter by sentiment (positive, negative, or all)
        timeframe_days: Number of days to look back
        post_type: Filter by type (post, comment, reply, review, or None for all)
        limit: Maximum number of posts to return
        sort_by: Sort results by (timestamp, sentiment_score, upvotes)

    Returns:
        Dictionary containing:
        - filters: Applied filters
        - count: Number of results
        - posts: List of posts with full metadata
    """

    # Get Pinecone index
    index = get_pinecone_index(
        config.PINECONE_INDEX_NAME,
        config.PINECONE_API_KEY
    )

    # Calculate cutoff timestamp
    cutoff_timestamp = time.time() - (timeframe_days * 24 * 60 * 60)

    # Build filter
    filter_dict = {"timestamp": {"$gte": cutoff_timestamp}}

    if platform != "all":
        filter_dict["source_platform"] = platform

    if sentiment != "all":
        if sentiment.lower() == "positive":
            filter_dict["sentiment_label"] = "POSITIVE"
        elif sentiment.lower() == "negative":
            filter_dict["sentiment_label"] = "NEGATIVE"

    if post_type:
        filter_dict["post_type"] = post_type

    # Query Pinecone
    # Use dummy vector for metadata-only query
    results = index.query(
        vector=[0.0] * 768,
        top_k=min(limit * 2, 10000),  # Fetch extra for sorting
        include_metadata=True,
        filter=filter_dict
    )

    # Format and sort results
    posts = []
    for match in results.matches:
        metadata = match.metadata
        posts.append({
            "text": metadata.get("text", ""),
            "sentiment_score": metadata.get("sentiment_score", 0),
            "sentiment_label": metadata.get("sentiment_label", "UNKNOWN"),
            "platform": metadata.get("source_platform", ""),
            "post_type": metadata.get("post_type", ""),
            "author": metadata.get("author", ""),
            "url": metadata.get("url", ""),
            "timestamp": metadata.get("datetime", ""),
            "upvotes": metadata.get("upvotes", 0),
            "source_id": metadata.get("source_identifier", ""),
            # Platform-specific metadata
            "subreddit": metadata.get("subreddit", ""),
            "title": metadata.get("title", ""),
            "rating": metadata.get("rating", None),
            "location": {
                "city": metadata.get("location_city", ""),
                "region": metadata.get("location_region", ""),
                "country": metadata.get("location_country", "")
            } if metadata.get("location_city") else None
        })

    # Sort results
    if sort_by == "timestamp":
        posts.sort(key=lambda x: x["timestamp"], reverse=True)
    elif sort_by == "sentiment_score":
        posts.sort(key=lambda x: abs(x["sentiment_score"]), reverse=True)
    elif sort_by == "upvotes":
        posts.sort(key=lambda x: x["upvotes"], reverse=True)

    # Limit results
    posts = posts[:limit]

    return {
        "filters": {
            "platform": platform,
            "sentiment": sentiment,
            "timeframe_days": timeframe_days,
            "post_type": post_type,
            "sort_by": sort_by
        },
        "count": len(posts),
        "posts": posts
    }
