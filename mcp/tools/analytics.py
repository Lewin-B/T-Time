"""
Analytics tools for sentiment aggregation and trend analysis
"""

import sys
import os
from typing import Dict, List, Any, Optional
from collections import Counter
from datetime import datetime, timedelta
import time

# Add parent directory to path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils import get_pinecone_index
import config


async def get_sentiment_summary(
    platform: str = "all",
    timeframe_days: int = 30,
    group_by: str = "platform"
) -> Dict[str, Any]:
    """
    Get aggregated sentiment statistics.

    Args:
        platform: Filter by platform (reddit, consumer-affairs, pissedconsumer, or all)
        timeframe_days: Number of days to analyze
        group_by: How to group results (platform, day, week, or overall)

    Returns:
        Dictionary containing aggregated statistics
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

    # Query all matching vectors (using a dummy vector for metadata filtering)
    # Note: Pinecone requires a vector query, so we'll fetch in batches
    results = index.query(
        vector=[0.0] * 768,  # Dummy vector
        top_k=10000,  # Maximum allowed
        include_metadata=True,
        filter=filter_dict
    )

    # Aggregate data
    total_count = len(results.matches)
    positive_count = 0
    negative_count = 0
    sentiment_scores = []
    platform_stats = {}

    for match in results.matches:
        metadata = match.metadata
        sentiment_label = metadata.get("sentiment_label", "UNKNOWN")
        sentiment_score = metadata.get("sentiment_score", 0)
        source_platform = metadata.get("source_platform", "unknown")

        # Count sentiment labels
        if sentiment_label == "POSITIVE":
            positive_count += 1
        elif sentiment_label == "NEGATIVE":
            negative_count += 1

        sentiment_scores.append(sentiment_score)

        # Group by platform if requested
        if group_by == "platform":
            if source_platform not in platform_stats:
                platform_stats[source_platform] = {
                    "count": 0,
                    "positive": 0,
                    "negative": 0,
                    "scores": []
                }
            platform_stats[source_platform]["count"] += 1
            if sentiment_label == "POSITIVE":
                platform_stats[source_platform]["positive"] += 1
            elif sentiment_label == "NEGATIVE":
                platform_stats[source_platform]["negative"] += 1
            platform_stats[source_platform]["scores"].append(sentiment_score)

    # Calculate averages
    avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0

    # Build response
    summary = {
        "timeframe_days": timeframe_days,
        "platform": platform,
        "total_posts": total_count,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "positive_percentage": (positive_count / total_count * 100) if total_count > 0 else 0,
        "negative_percentage": (negative_count / total_count * 100) if total_count > 0 else 0,
        "average_sentiment_score": round(avg_sentiment, 4),
    }

    if group_by == "platform" and platform_stats:
        summary["by_platform"] = {}
        for plat, stats in platform_stats.items():
            avg_score = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
            summary["by_platform"][plat] = {
                "count": stats["count"],
                "positive": stats["positive"],
                "negative": stats["negative"],
                "positive_percentage": (stats["positive"] / stats["count"] * 100) if stats["count"] > 0 else 0,
                "average_sentiment_score": round(avg_score, 4)
            }

    return summary


async def compare_sentiment(
    period1_days: int,
    period2_days: int,
    platform: str = "all"
) -> Dict[str, Any]:
    """
    Compare sentiment between two time periods.

    Args:
        period1_days: Recent period (e.g., last 7 days)
        period2_days: Older period (e.g., 7-14 days ago)
        platform: Filter by platform

    Returns:
        Dictionary with comparison statistics and trends
    """

    # Get data for both periods
    period1 = await get_sentiment_summary(platform, period1_days, "overall")

    # For period 2, we need to query from period1_days ago to period2_days ago
    # This requires a custom query
    index = get_pinecone_index(
        config.PINECONE_INDEX_NAME,
        config.PINECONE_API_KEY
    )

    # Period 2: from (period1_days + period2_days) ago to period1_days ago
    start_timestamp = time.time() - ((period1_days + period2_days) * 24 * 60 * 60)
    end_timestamp = time.time() - (period1_days * 24 * 60 * 60)

    filter_dict = {
        "timestamp": {
            "$gte": start_timestamp,
            "$lte": end_timestamp
        }
    }
    if platform != "all":
        filter_dict["source_platform"] = platform

    results = index.query(
        vector=[0.0] * 768,
        top_k=10000,
        include_metadata=True,
        filter=filter_dict
    )

    # Calculate period 2 stats
    total_count = len(results.matches)
    positive_count = sum(1 for m in results.matches if m.metadata.get("sentiment_label") == "POSITIVE")
    negative_count = sum(1 for m in results.matches if m.metadata.get("sentiment_label") == "NEGATIVE")
    scores = [m.metadata.get("sentiment_score", 0) for m in results.matches]
    avg_sentiment = sum(scores) / len(scores) if scores else 0

    period2 = {
        "total_posts": total_count,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "positive_percentage": (positive_count / total_count * 100) if total_count > 0 else 0,
        "average_sentiment_score": round(avg_sentiment, 4)
    }

    # Calculate changes
    sentiment_change = period1["average_sentiment_score"] - period2["average_sentiment_score"]
    positive_pct_change = period1["positive_percentage"] - period2["positive_percentage"]

    return {
        "platform": platform,
        "period1": {
            "days": period1_days,
            "label": f"Last {period1_days} days",
            "stats": period1
        },
        "period2": {
            "days": period2_days,
            "label": f"{period1_days}-{period1_days + period2_days} days ago",
            "stats": period2
        },
        "changes": {
            "sentiment_score_change": round(sentiment_change, 4),
            "positive_percentage_change": round(positive_pct_change, 2),
            "trend": "improving" if sentiment_change > 0 else "declining" if sentiment_change < 0 else "stable"
        }
    }


async def get_trending_topics(
    platform: str = "all",
    timeframe_days: int = 7,
    min_mentions: int = 3
) -> Dict[str, Any]:
    """
    Identify trending topics and keywords.

    Args:
        platform: Filter by platform
        timeframe_days: Time period to analyze
        min_mentions: Minimum mentions to be considered trending

    Returns:
        Dictionary with trending keywords and topics
    """

    # Get Pinecone index
    index = get_pinecone_index(
        config.PINECONE_INDEX_NAME,
        config.PINECONE_API_KEY
    )

    # Calculate cutoff timestamp
    cutoff_timestamp = time.time() - (timeframe_days * 24 * 60 * 60)

    filter_dict = {"timestamp": {"$gte": cutoff_timestamp}}
    if platform != "all":
        filter_dict["source_platform"] = platform

    results = index.query(
        vector=[0.0] * 768,
        top_k=10000,
        include_metadata=True,
        filter=filter_dict
    )

    # Extract keywords from text (simple word frequency)
    # In production, you'd use proper NLP for topic extraction
    word_counts = Counter()
    word_sentiments = {}

    # Common words to ignore
    stopwords = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                     'of', 'with', 'by', 'from', 'is', 'was', 'are', 'been', 'be', 'have',
                     'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
                     'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
                     'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
                     'our', 'their', 'me', 'him', 'them', 'us'])

    for match in results.matches:
        text = match.metadata.get("text", "").lower()
        sentiment = match.metadata.get("sentiment_score", 0)

        # Simple word extraction
        words = text.split()
        for word in words:
            # Clean word
            word = ''.join(c for c in word if c.isalnum())
            if len(word) > 3 and word not in stopwords:
                word_counts[word] += 1
                if word not in word_sentiments:
                    word_sentiments[word] = []
                word_sentiments[word].append(sentiment)

    # Filter by minimum mentions and get top topics
    trending = []
    for word, count in word_counts.most_common(20):
        if count >= min_mentions:
            sentiments = word_sentiments[word]
            avg_sentiment = sum(sentiments) / len(sentiments)
            trending.append({
                "keyword": word,
                "mentions": count,
                "average_sentiment": round(avg_sentiment, 4),
                "sentiment_label": "positive" if avg_sentiment > 0 else "negative"
            })

    return {
        "platform": platform,
        "timeframe_days": timeframe_days,
        "total_posts_analyzed": len(results.matches),
        "trending_topics": trending
    }
