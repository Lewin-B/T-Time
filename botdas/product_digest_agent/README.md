# T-Mobile Product Digest Agent

This agent generates weekly digests about user sentiments based on the most recent customer feedback data. It uses RAG (Retrieval Augmented Generation) to query the Pinecone index for recent customer sentiment data.

## Features

- **Sentiment Analysis**: Queries Pinecone index for the most recent customer feedback (last 7 days)
- **Weekly Digests**: Compiles comprehensive reports with sentiment metrics, trends, and insights
- **Email Delivery**: Sends digests via email using Resend (if configured)

## Setup

### Prerequisites

1. **Pinecone**: Ensure your Pinecone index is configured
   - Set `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` in your `.env` file

2. **Google ADK**: The agent uses Google ADK (Agent Development Kit)
   - Set `AGENT_MODEL` (default: `gemini-2.5-flash`) in your `.env` file

3. **Email**: For email delivery using Resend, configure:
   - `EMAIL_RECIPIENT`: Email address to send digests to
   - `EMAIL_SENDER`: Sender email address (must be from a verified domain in Resend)
   - `RESEND_API_KEY`: Your Resend API key (get from https://resend.com/api-keys)

### Environment Variables

Add these to your `.env` file in the project root:

```bash
# Pinecone (if not already set)
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=ttime-sentiment

# Agent Configuration
AGENT_MODEL=gemini-2.5-flash

# Email Configuration (optional - using Resend)
EMAIL_RECIPIENT=your-email@example.com
EMAIL_SENDER=noreply@yourdomain.com  # Must be from a verified domain in Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Get from https://resend.com/api-keys
```

## Usage

### Run Weekly Digest Manually

```bash
cd botdas/product_digest_agent
python run_weekly_digest.py
```

The digest will be:
1. Printed to stdout
2. Saved to `digests/digest_YYYYMMDD_HHMMSS.txt`
3. Emailed (if email is configured)

### Run Agent Interactively

```bash
cd botdas/product_digest_agent
python -m agent
```

This will run the agent and generate a digest interactively.

### Schedule Weekly Runs

#### Using Cron (Linux/Mac)

Add to your crontab (`crontab -e`):

```bash
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/T-Time/botdas/product_digest_agent && /path/to/python run_weekly_digest.py >> logs/digest.log 2>&1
```

#### Using systemd (Linux)

Create `/etc/systemd/system/tmobile-digest.service`:

```ini
[Unit]
Description=T-Mobile Product Digest Agent
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/T-Time/botdas/product_digest_agent
ExecStart=/path/to/python run_weekly_digest.py
```

Create `/etc/systemd/system/tmobile-digest.timer`:

```ini
[Unit]
Description=Run T-Mobile Digest Weekly
Requires=tmobile-digest.service

[Timer]
OnCalendar=Mon 09:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable tmobile-digest.timer
sudo systemctl start tmobile-digest.timer
```

## How It Works

The agent uses two tools:

1. **`index_pinecone`**:
   - Queries the Pinecone index using semantic search (RAG)
   - Retrieves the most recent customer feedback (last 7 days by default)
   - Calculates sentiment statistics (positive %, negative %, average scores)
   - Returns sentiment data from Reddit, Threads, and Consumer Affairs
   - Can be called multiple times with different queries to get comprehensive coverage

2. **`send_weekly_digest_email`**:
   - Sends the completed digest via email using Resend
   - Optionally saves the digest to a file before sending
   - Includes the digest as both HTML and plain text
   - Attaches the digest file if saved

3. **Digest Generation**:
   - The agent queries Pinecone for recent sentiment data using various search terms
   - Analyzes trends, themes, and patterns in customer feedback
   - Compiles findings into a structured weekly report
   - Includes sentiment breakdowns, key themes, and actionable insights
   - Automatically sends the digest via email when complete

## Output Format

The weekly digest includes:

- **Executive Summary**: Overall sentiment trends from the past week
- **Key Themes**: Main topics and themes customers are discussing
- **Sentiment Statistics**: Overall positive/negative percentages and average scores
- **Notable Feedback**: Specific complaints and praises with examples
- **Platform Breakdown**: Sentiment analysis by platform (Reddit, Threads, Consumer Affairs)
- **Trends and Patterns**: Emerging topics and changes in sentiment
- **Actionable Insights**: Recommendations based on findings
- **Data Sources**: Citations and references

## Troubleshooting

### Pinecone Query Issues

- Verify Pinecone credentials are set correctly
- Check that the index name matches your configuration
- Ensure the index contains recent sentiment data

### Email Delivery Issues

- Ensure your sender email domain is verified in Resend
- Verify your Resend API key is correct and has proper permissions
- Check that the sender email matches a verified domain in your Resend account
- For testing, you can use Resend's test mode or verify your domain first

## Files

- `agent.py`: Main agent implementation with `index_pinecone` and `send_weekly_digest_email` tools
- `config.py`: Configuration settings
- `run_weekly_digest.py`: Script to run weekly digest generation
- `digests/`: Directory where digest files are saved

## License

Same as parent project.

