"""
T-Mobile Product Digest Agent

This agent generates weekly digests about user sentiments based on the most recent customer feedback.
It queries Pinecone using RAG (Retrieval Augmented Generation) to analyze recent sentiment data.
"""

import sys
import os
from typing import Dict, Any, Optional, List
import time
import base64

# Add parent directories to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mcp_path = os.path.join(project_root, 'mcp')
sys.path.append(mcp_path)

from utils import get_pinecone_index, generate_embedding
import config as mcp_config
from . import config
from google.adk.agents import Agent
from datetime import datetime
from pathlib import Path


def index_pinecone(product_name: str, related_keywords: Optional[List[str]] = None, timeframe_days: int = 30, limit: int = 20) -> dict:
    """Queries Pinecone index for customer sentiment data related to a specific T-Mobile product.
    Uses RAG (Retrieval Augmented Generation) with semantic search.
    
    Args:
        product_name (str): Name of the product to search for (e.g., 'Go5G Plus', 'iPhone 15')
        related_keywords (List[str], optional): Related keywords to include in search
        timeframe_days (int): Number of days to look back (default 30)
        limit (int): Maximum number of results to return (default 20)
    
    Returns:
        dict: status and sentiment data or error message
    """
    try:
        # Build search query
        if related_keywords:
            query_text = f"{product_name} {' '.join(related_keywords)}"
        else:
            query_text = product_name
        
        # Generate query embedding
        query_embedding = generate_embedding(query_text)
        
        # Get Pinecone index
        index = get_pinecone_index(
            mcp_config.PINECONE_INDEX_NAME,
            mcp_config.PINECONE_API_KEY
        )
        
        # Build filter for timeframe
        cutoff_timestamp = time.time() - (timeframe_days * 24 * 60 * 60)
        filter_dict = {
            "timestamp": {"$gte": cutoff_timestamp}
        }
        
        # Query Pinecone
        results = index.query(
            vector=query_embedding,
            top_k=limit,
            include_metadata=True,
            filter=filter_dict
        )
        
        # Format results
        matches = []
        sentiment_counts = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
        sentiment_scores = []
        
        for match in results.matches:
            sentiment_label = match.metadata.get("sentiment_label", "UNKNOWN")
            sentiment_score = match.metadata.get("sentiment_score", 0)
            
            # Count sentiments
            if sentiment_label in sentiment_counts:
                sentiment_counts[sentiment_label] += 1
            sentiment_scores.append(sentiment_score)
            
            matches.append({
                "score": float(match.score),
                "text": match.metadata.get("text", ""),
                "sentiment_score": sentiment_score,
                "sentiment_label": sentiment_label,
                "platform": match.metadata.get("source_platform", ""),
                "post_type": match.metadata.get("post_type", ""),
                "author": match.metadata.get("author", ""),
                "url": match.metadata.get("url", ""),
                "timestamp": match.metadata.get("datetime", ""),
                "upvotes": match.metadata.get("upvotes", 0),
            })
        
        # Calculate sentiment summary
        total = len(matches)
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        
        sentiment_summary = {
            "total_posts": total,
            "positive_count": sentiment_counts["POSITIVE"],
            "negative_count": sentiment_counts["NEGATIVE"],
            "neutral_count": sentiment_counts["NEUTRAL"],
            "positive_percentage": (sentiment_counts["POSITIVE"] / total * 100) if total > 0 else 0,
            "negative_percentage": (sentiment_counts["NEGATIVE"] / total * 100) if total > 0 else 0,
            "neutral_percentage": (sentiment_counts["NEUTRAL"] / total * 100) if total > 0 else 0,
            "average_sentiment_score": avg_sentiment
        }
        
        return {
            "status": "success",
            "product": product_name,
            "query": query_text,
            "count": len(matches),
            "matches": matches,
            "sentiment_summary": sentiment_summary
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Error querying Pinecone: {str(e)}"
        }


def send_weekly_digest_email(digest_content: str, save_to_file: bool = True) -> dict:
    """Sends the weekly digest via email using Resend.
    
    Args:
        digest_content (str): The digest content to send
        save_to_file (bool): Whether to save the digest to a file before sending (default True)
    
    Returns:
        dict: status and result or error message
    """
    try:
        import resend
    except ImportError:
        return {
            "status": "error",
            "error_message": "Resend library not installed. Install with: pip install resend"
        }
    
    if not all([config.EMAIL_RECIPIENT, config.EMAIL_SENDER, config.RESEND_API_KEY]):
        return {
            "status": "error",
            "error_message": "Email configuration incomplete. Please set EMAIL_RECIPIENT, EMAIL_SENDER, and RESEND_API_KEY environment variables."
        }
    
    try:
        # Initialize Resend
        resend.api_key = config.RESEND_API_KEY
        
        # Save to file if requested
        filepath = None
        attachment_content = None
        if save_to_file:
            output_dir = Path(__file__).parent / "digests"
            output_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = output_dir / f"digest_{timestamp}.txt"
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"Weekly T-Mobile Product Sentiment Digest\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*80 + "\n\n")
                f.write(digest_content)
            
            # Read file for attachment and encode as base64
            with open(filepath, 'rb') as f:
                attachment_bytes = f.read()
                attachment_content = base64.b64encode(attachment_bytes).decode('utf-8')
        
        # Send email via Resend
        params = {
            "from": config.EMAIL_SENDER,
            "to": [config.EMAIL_RECIPIENT],
            "subject": f"T-Mobile Product Sentiment Weekly Digest - {datetime.now().strftime('%Y-%m-%d')}",
            "html": f"""<html>
<body>
<h2>Weekly T-Mobile Product Sentiment Digest</h2>
<p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
<pre style="white-space: pre-wrap; font-family: monospace;">{digest_content}</pre>
<hr>
<p><em>This is an automated weekly digest from the T-Mobile Product Sentiment Analysis Agent.</em></p>
</body>
</html>""",
            "text": f"""Weekly T-Mobile Product Sentiment Digest

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{digest_content}

---
This is an automated weekly digest from the T-Mobile Product Sentiment Analysis Agent.
"""
        }
        
        # Add attachment if file was saved
        if attachment_content and filepath:
            params["attachments"] = [
                {
                    "filename": filepath.name,
                    "content": attachment_content
                }
            ]
        
        email = resend.Emails.send(params)
        email_id = email.get('id', 'unknown')
        
        result_message = f"Digest emailed successfully to {config.EMAIL_RECIPIENT}"
        if filepath:
            result_message += f" and saved to {filepath}"
        result_message += f" (Email ID: {email_id})"
        
        return {
            "status": "success",
            "message": result_message,
            "email_id": email_id,
            "recipient": config.EMAIL_RECIPIENT,
            "filepath": str(filepath) if filepath else None
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Error sending email: {str(e)}"
        }


root_agent = Agent(
    name=config.AGENT_NAME,
    model=config.AGENT_MODEL,
    description=config.AGENT_DESCRIPTION,
    instruction=config.AGENT_INSTRUCTION,
    tools=[index_pinecone, send_weekly_digest_email],
)
