#!/usr/bin/env python3
"""
Weekly Digest Runner

Schedules and runs the weekly T-Mobile product sentiment digest.
Can be run manually or scheduled via cron/systemd.
"""

import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import root_agent
import asyncio
import config


async def run_digest_and_save():
    """
    Generate the weekly digest and save it to a file.
    Optionally sends email if configured.
    """
    print(f"[{datetime.now()}] Starting weekly digest generation...")
    
    try:
        # Generate digest from most recent sentiment data
        prompt = """Generate a weekly digest of user sentiments based on the most recent T-Mobile customer feedback.

Please follow these steps:
1. Use index_pinecone to query for recent customer sentiment data (last 7 days). Try multiple queries to get comprehensive coverage:
   - Query for general T-Mobile sentiment
   - Query for specific products/services (e.g., "Go5G", "5G network", "customer service", "billing")
   - Query for trending topics
2. Compile a comprehensive weekly digest report that includes:
   - Executive summary of overall sentiment trends from the past week
   - Key themes and topics customers are discussing
   - Sentiment statistics (positive %, negative %, average sentiment score)
   - Notable complaints and praises with examples
   - Platform breakdown (Reddit, Threads, Consumer Affairs)
   - Trends and patterns identified
   - Actionable insights and recommendations

3. After generating the digest, use the send_weekly_digest_email tool to send it via email.

Format the digest in a clear, professional manner suitable for business stakeholders."""
        
        response = await root_agent.run(prompt)
        # Handle different response types
        if hasattr(response, 'text'):
            digest = response.text
        elif hasattr(response, 'content'):
            digest = response.content
        elif isinstance(response, str):
            digest = response
        else:
            digest = str(response)
        
        # Create output directory if it doesn't exist
        output_dir = Path(__file__).parent / "digests"
        output_dir.mkdir(exist_ok=True)
        
        # Save to file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = output_dir / f"digest_{timestamp}.txt"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"Weekly T-Mobile Product Sentiment Digest\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*80 + "\n\n")
            f.write(digest)
        
        print(f"[{datetime.now()}] Digest saved to: {filename}")
        
        # Note: Email sending is now handled by the agent's send_weekly_digest_email tool
        # The agent can call this tool directly after generating the digest
        
        return digest
        
    except Exception as e:
        print(f"[{datetime.now()}] Error generating digest: {e}", file=sys.stderr)
        raise


async def send_email_digest(digest: str, filepath: Path):
    """
    Send the digest via email using Resend if email configuration is available.
    """
    try:
        import resend
        
        if not all([config.EMAIL_RECIPIENT, config.EMAIL_SENDER, config.RESEND_API_KEY]):
            print("Email configuration incomplete, skipping email send")
            return
        
        # Initialize Resend
        resend.api_key = config.RESEND_API_KEY
        
        # Read attachment file
        with open(filepath, 'rb') as f:
            attachment_content = f.read()
        
        # Send email via Resend
        params = {
            "from": config.EMAIL_SENDER,
            "to": [config.EMAIL_RECIPIENT],
            "subject": f"T-Mobile Product Sentiment Weekly Digest - {datetime.now().strftime('%Y-%m-%d')}",
            "html": f"""<html>
<body>
<h2>Weekly T-Mobile Product Sentiment Digest</h2>
<p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
<pre style="white-space: pre-wrap; font-family: monospace;">{digest}</pre>
<hr>
<p><em>This is an automated weekly digest from the T-Mobile Product Sentiment Analysis Agent.</em></p>
</body>
</html>""",
            "text": f"""Weekly T-Mobile Product Sentiment Digest

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{digest}

---
This is an automated weekly digest from the T-Mobile Product Sentiment Analysis Agent.
""",
            "attachments": [
                {
                    "filename": filepath.name,
                    "content": attachment_content
                }
            ]
        }
        
        email = resend.Emails.send(params)
        
        print(f"[{datetime.now()}] Digest emailed to: {config.EMAIL_RECIPIENT} (ID: {email.get('id', 'unknown')})")
        
    except ImportError:
        print(f"[{datetime.now()}] Resend library not installed. Install with: pip install resend", file=sys.stderr)
    except Exception as e:
        print(f"[{datetime.now()}] Error sending email: {e}", file=sys.stderr)
        # Don't raise - email failure shouldn't fail the whole process


async def main():
    """
    Main entry point.
    """
    try:
        digest = await run_digest_and_save()
        print(f"\n[{datetime.now()}] Weekly digest generation completed successfully!")
        return 0
    except Exception as e:
        print(f"\n[{datetime.now()}] Failed to generate digest: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

