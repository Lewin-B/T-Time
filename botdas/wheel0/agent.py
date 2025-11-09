"""
T-Time Sentiment Analysis Agent

This agent provides customer sentiment analysis for T-Mobile using MCP tools.
"""

from google.adk.agents.llm_agent import Agent
from google.adk.tools import MCPToolset
from google.adk.tools.mcp import StdioServerParams
import asyncio
import os
import sys

# Import configuration
from . import config


async def create_agent():
    """
    Create and initialize the sentiment analysis agent with MCP tools.

    Returns:
        Agent: Configured agent with MCP toolset
    """

    # Get the path to the MCP server
    # Assuming botdas/ and mcp/ are siblings in the project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    mcp_server_path = os.path.join(project_root, 'mcp', 'server.py')

    # Initialize MCP toolset with stdio connection
    tools, exit_stack = await MCPToolset.from_server(
        connection_params=StdioServerParams(
            command=config.MCP_SERVER_COMMAND,
            args=[mcp_server_path],
            env={
                'PYTHONPATH': os.path.join(project_root, 'mcp'),
                **os.environ  # Inherit current environment
            }
        )
    )

    # Create agent with MCP tools
    agent = Agent(
        model=config.AGENT_MODEL,
        name=config.AGENT_NAME,
        description=config.AGENT_DESCRIPTION,
        instruction=config.AGENT_INSTRUCTION,
        tools=tools
    )

    return agent, exit_stack


# For backward compatibility and simple imports
# Note: This will be None until initialized asynchronously
root_agent = None


async def init_agent():
    """
    Initialize the root agent asynchronously.
    Call this before using the agent.
    """
    global root_agent
    if root_agent is None:
        root_agent, _ = await create_agent()
    return root_agent


# Helper function for synchronous initialization (if needed)
def get_agent():
    """
    Get the initialized agent. Must be called within an async context.
    """
    if root_agent is None:
        raise RuntimeError(
            "Agent not initialized. Call 'await init_agent()' first."
        )
    return root_agent
