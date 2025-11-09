"""
T-Time MCP Server

Provides sentiment analysis tools for AI agents to query customer feedback data.
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from typing import Any
import asyncio

# Import tool functions
from tools.search import search_sentiment
from tools.analytics import get_sentiment_summary, compare_sentiment, get_trending_topics
from tools.fetch import fetch_recent_posts


# Initialize MCP server
server = Server("ttime-sentiment")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """
    List all available tools for sentiment analysis.
    """
    return [
        Tool(
            name="search_sentiment",
            description="Perform semantic search across customer sentiment data from Reddit, Threads, and Consumer Affairs. Returns posts/comments most relevant to the query.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language search query (e.g., 'network coverage issues', 'customer service complaints')"
                    },
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform: 'reddit', 'threads', 'consumer-affairs', or 'all'",
                        "enum": ["all", "reddit", "threads", "consumer-affairs"],
                        "default": "all"
                    },
                    "timeframe_days": {
                        "type": "integer",
                        "description": "Limit to posts from last N days (optional)",
                        "minimum": 1,
                        "maximum": 180
                    },
                    "sentiment_filter": {
                        "type": "string",
                        "description": "Filter by sentiment: 'positive', 'negative', or null for all",
                        "enum": ["positive", "negative"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_sentiment_summary",
            description="Get aggregated sentiment statistics and trends. Returns overall sentiment metrics, positive/negative percentages, and breakdowns by platform.",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform: 'reddit', 'threads', 'consumer-affairs', or 'all'",
                        "enum": ["all", "reddit", "threads", "consumer-affairs"],
                        "default": "all"
                    },
                    "timeframe_days": {
                        "type": "integer",
                        "description": "Number of days to analyze",
                        "default": 30,
                        "minimum": 1,
                        "maximum": 180
                    },
                    "group_by": {
                        "type": "string",
                        "description": "How to group results: 'platform', 'day', 'week', or 'overall'",
                        "enum": ["platform", "day", "week", "overall"],
                        "default": "platform"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="compare_sentiment",
            description="Compare sentiment between two time periods to identify trends. Shows if sentiment is improving, declining, or stable.",
            inputSchema={
                "type": "object",
                "properties": {
                    "period1_days": {
                        "type": "integer",
                        "description": "Recent period in days (e.g., 7 for last week)",
                        "minimum": 1,
                        "maximum": 90
                    },
                    "period2_days": {
                        "type": "integer",
                        "description": "Older comparison period in days (e.g., 7 for the week before)",
                        "minimum": 1,
                        "maximum": 90
                    },
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform: 'reddit', 'threads', 'consumer-affairs', or 'all'",
                        "enum": ["all", "reddit", "threads", "consumer-affairs"],
                        "default": "all"
                    }
                },
                "required": ["period1_days", "period2_days"]
            }
        ),
        Tool(
            name="get_trending_topics",
            description="Identify trending topics and keywords in customer feedback. Shows what customers are talking about most.",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform: 'reddit', 'threads', 'consumer-affairs', or 'all'",
                        "enum": ["all", "reddit", "threads", "consumer-affairs"],
                        "default": "all"
                    },
                    "timeframe_days": {
                        "type": "integer",
                        "description": "Time period to analyze",
                        "default": 7,
                        "minimum": 1,
                        "maximum": 90
                    },
                    "min_mentions": {
                        "type": "integer",
                        "description": "Minimum mentions to be considered trending",
                        "default": 3,
                        "minimum": 1
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="fetch_recent_posts",
            description="Fetch recent posts and comments with optional filtering. Returns full post metadata including text, author, URLs, and sentiment scores.",
            inputSchema={
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "Filter by platform: 'reddit', 'threads', 'consumer-affairs', or 'all'",
                        "enum": ["all", "reddit", "threads", "consumer-affairs"],
                        "default": "all"
                    },
                    "sentiment": {
                        "type": "string",
                        "description": "Filter by sentiment: 'positive', 'negative', or 'all'",
                        "enum": ["all", "positive", "negative"],
                        "default": "all"
                    },
                    "timeframe_days": {
                        "type": "integer",
                        "description": "Number of days to look back",
                        "default": 7,
                        "minimum": 1,
                        "maximum": 180
                    },
                    "post_type": {
                        "type": "string",
                        "description": "Filter by type: 'post', 'comment', 'reply', 'review', or null for all",
                        "enum": ["post", "comment", "reply", "review"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of posts to return",
                        "default": 20,
                        "minimum": 1,
                        "maximum": 100
                    },
                    "sort_by": {
                        "type": "string",
                        "description": "Sort results by: 'timestamp' (newest first), 'sentiment_score' (strongest sentiment first), or 'upvotes'",
                        "enum": ["timestamp", "sentiment_score", "upvotes"],
                        "default": "timestamp"
                    }
                },
                "required": []
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """
    Handle tool calls from agents.
    """
    import json

    try:
        # Route to appropriate tool function
        if name == "search_sentiment":
            result = await search_sentiment(
                query=arguments["query"],
                platform=arguments.get("platform", "all"),
                timeframe_days=arguments.get("timeframe_days"),
                sentiment_filter=arguments.get("sentiment_filter"),
                limit=arguments.get("limit", 10)
            )

        elif name == "get_sentiment_summary":
            result = await get_sentiment_summary(
                platform=arguments.get("platform", "all"),
                timeframe_days=arguments.get("timeframe_days", 30),
                group_by=arguments.get("group_by", "platform")
            )

        elif name == "compare_sentiment":
            result = await compare_sentiment(
                period1_days=arguments["period1_days"],
                period2_days=arguments["period2_days"],
                platform=arguments.get("platform", "all")
            )

        elif name == "get_trending_topics":
            result = await get_trending_topics(
                platform=arguments.get("platform", "all"),
                timeframe_days=arguments.get("timeframe_days", 7),
                min_mentions=arguments.get("min_mentions", 3)
            )

        elif name == "fetch_recent_posts":
            result = await fetch_recent_posts(
                platform=arguments.get("platform", "all"),
                sentiment=arguments.get("sentiment", "all"),
                timeframe_days=arguments.get("timeframe_days", 7),
                post_type=arguments.get("post_type"),
                limit=arguments.get("limit", 20),
                sort_by=arguments.get("sort_by", "timestamp")
            )

        else:
            raise ValueError(f"Unknown tool: {name}")

        # Format response
        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2)
        )]

    except Exception as e:
        # Return error information
        return [TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "tool": name,
                "arguments": arguments
            }, indent=2)
        )]


async def main():
    """
    Run the MCP server using stdio transport.
    """
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
