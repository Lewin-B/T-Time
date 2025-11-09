#!/usr/bin/env python3
"""
Reddit Incremental Scraper for T-Time Dashboard

Fetches new posts and comments since the last scrape,
performs sentiment analysis, generates embeddings, and uploads to Pinecone.
Designed to be called periodically or via API.
"""

import praw
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from tqdm import tqdm
import config as config
import utils as utils


def create_reddit_metadata(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create standardized metadata for a Reddit data item.

    Args:
        item: A dictionary containing scraped Reddit data.

    Returns:
        A metadata dictionary ready for Pinecone.
    """
    metadata = {
        'source_platform': config.SOURCE_PLATFORM,
        'source_type': config.SOURCE_TYPE,
        'source_identifier': item['id'],
        'post_type': item['type'],
        'upvotes': item['upvotes'],
        'timestamp': item['timestamp'],
        'datetime': datetime.fromtimestamp(item['timestamp']).isoformat(),
        'sentiment_score': item['sentiment']['sentiment_value'],
        'sentiment_label': item['sentiment']['label'],
        'author': item['author'],
        'subreddit': item['subreddit'],
        'url': item.get('url') or f"https://reddit.com/comments/{item['id']}"
    }

    if item.get('title'):
        metadata['title'] = item['title']

    if item.get('parent_id'):
        metadata['parent_id'] = item['parent_id']

    # Extract location from text (only adds if state is detected)
    location = utils.extract_location(item['text'])
    if location['location_city']:
        metadata['location_city'] = location['location_city']
    if location['location_state']:
        metadata['location_state'] = location['location_state']
    if location['location_country']:
        metadata['location_country'] = location['location_country']
    if location['location_raw']:
        metadata['location_raw'] = location['location_raw']
    if location['location_confidence'] is not None:
        metadata['location_confidence'] = location['location_confidence']

    return metadata


class RedditIncrementalScraper:
    def __init__(self, state_file: str = "last_scrape_state.json"):
        """
        Initialize the Reddit incremental scraper.

        Args:
            state_file: Path to file storing last scrape timestamps
        """
        # Setup logger
        self.logger = utils.setup_logger("reddit_incremental_scraper")
        self.logger.info("Initializing Reddit Incremental Scraper...")

        # Initialize Reddit client
        self.reddit = praw.Reddit(
            client_id=config.REDDIT_CLIENT_ID,
            client_secret=config.REDDIT_CLIENT_SECRET,
            user_agent=config.REDDIT_USER_AGENT
        )

        self.logger.info(f"Connected to Reddit (read-only: {self.reddit.read_only})")

        # Initialize models
        utils.init_sentiment_analyzer()
        utils.init_embedding_model()
        utils.init_pinecone(config.PINECONE_API_KEY)

        self.state_file = state_file
        self.state = utils.load_state(self.state_file)
        if self.state:
            self.logger.info(f"Loaded state from {self.state_file}")
        else:
            self.logger.info("No previous state file found, starting fresh")

        self.collected_data = []
        self.skipped_count = 0
        self.error_count = 0

    def scrape_submission(self, submission) -> List[Dict[str, Any]]:
        """
        Scrape a single submission and its comments.

        Args:
            submission: PRAW submission object

        Returns:
            List of data dictionaries (post + comments)
        """
        data_items = []

        try:
            # Scrape the main post
            post_text = f"{submission.title}\n\n{submission.selftext}" if submission.selftext else submission.title

            # Skip if post is too short or deleted
            if len(post_text.strip()) < 10 or submission.author is None:
                self.skipped_count += 1
                return data_items

            # Analyze sentiment
            sentiment = utils.analyze_sentiment(post_text)

            # Create post data
            post_data = {
                'id': submission.id,
                'type': 'post',
                'text': post_text,
                'title': submission.title,
                'upvotes': submission.score,
                'timestamp': submission.created_utc,
                'author': str(submission.author),
                'subreddit': str(submission.subreddit),
                'url': f"https://reddit.com{submission.permalink}",
                'num_comments': submission.num_comments,
                'sentiment': sentiment
            }

            data_items.append(post_data)

            # Scrape comments
            submission.comments.replace_more(limit=0)

            comments_data = []
            for comment in submission.comments.list():
                try:
                    # Skip deleted/removed comments or very short ones
                    if comment.author is None or len(comment.body.strip()) < 10:
                        continue

                    # Analyze comment sentiment
                    comment_sentiment = utils.analyze_sentiment(comment.body)

                    # Create comment data
                    comment_data = {
                        'id': comment.id,
                        'type': 'comment',
                        'text': comment.body,
                        'upvotes': comment.score,
                        'timestamp': comment.created_utc,
                        'author': str(comment.author),
                        'subreddit': str(comment.subreddit),
                        'url': f"https://reddit.com{comment.permalink}",
                        'parent_id': submission.id,
                        'parent_title': submission.title,
                        'sentiment': comment_sentiment
                    }

                    data_items.append(comment_data)
                    comments_data.append(comment_data)

                except Exception as e:
                    self.logger.warning(f"Error processing comment: {e}")
                    self.error_count += 1
                    continue

            # Log post details
            utils.log_post_processing(self.logger, post_data, len(comments_data))

        except Exception as e:
            self.logger.error(f"Error processing submission: {e}")
            self.error_count += 1

        return data_items

    def scrape_new_posts(self, subreddit_name: str, last_timestamp: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Scrape new posts from a subreddit since last timestamp.

        Args:
            subreddit_name: Name of the subreddit
            last_timestamp: Unix timestamp of last scrape (None for first run)

        Returns:
            List of collected data items
        """
        self.logger.info("=" * 80)
        self.logger.info(f"Scraping new posts from r/{subreddit_name}")
        self.logger.info("=" * 80)

        if last_timestamp:
            last_time = datetime.fromtimestamp(last_timestamp).strftime('%Y-%m-%d %H:%M:%S')
            self.logger.info(f"Looking for posts since: {last_time}")
        else:
            self.logger.info("First run - scraping last 20 posts")

        subreddit = self.reddit.subreddit(subreddit_name)
        collected_items = []

        try:
            # Get new posts (limit to reasonable number for incremental updates)
            limit = 20 if last_timestamp is None else 100
            new_posts = subreddit.new(limit=limit)

            posts_processed = 0
            posts_found = 0

            for submission in tqdm(new_posts, desc="Processing new posts", total=limit):
                posts_processed += 1

                # If we have a last timestamp, only process newer posts
                if last_timestamp and submission.created_utc <= last_timestamp:
                    continue

                posts_found += 1

                # Scrape submission and comments
                items = self.scrape_submission(submission)
                collected_items.extend(items)

                # Rate limiting
                time.sleep(config.RATE_LIMIT_DELAY)

            self.logger.info("=" * 80)
            self.logger.info(f"Processed {posts_processed} posts, found {posts_found} new posts")
            self.logger.info(f"Collected {len(collected_items)} items (posts + comments)")
            self.logger.info(f"Skipped: {self.skipped_count} | Errors: {self.error_count}")
            self.logger.info("=" * 80)

        except Exception as e:
            self.logger.error(f"Error scraping subreddit: {e}")
            self.error_count += 1

        return collected_items

    def run(self) -> Dict[str, Any]:
        """
        Run the incremental scraper.

        Returns:
            Dictionary with run statistics
        """
        self.logger.info("=" * 80)
        self.logger.info("Starting Reddit Incremental Scraper")
        self.logger.info("=" * 80)

        start_time = time.time()
        current_timestamp = time.time()

        stats = {
            'subreddits_processed': 0,
            'total_items_collected': 0,
            'total_items_uploaded': 0,
            'errors': 0,
            'timestamp': current_timestamp,
            'datetime': datetime.fromtimestamp(current_timestamp).isoformat()
        }

        # Scrape all configured subreddits
        all_data = []
        for subreddit_name in config.TARGET_SUBREDDITS:
            subreddit_name = subreddit_name.strip()
            last_timestamp = self.state.get(subreddit_name)

            data = self.scrape_new_posts(subreddit_name, last_timestamp)
            all_data.extend(data)

            # Update state with current timestamp
            self.state[subreddit_name] = current_timestamp

            stats['subreddits_processed'] += 1

        stats['total_items_collected'] = len(all_data)
        stats['errors'] = self.error_count

        # Process and upload
        if all_data:
            # Upload to Pinecone
            uploaded_count = utils.process_and_upload_to_pinecone(
                data_items=all_data,
                source_platform='reddit',
                index_name=config.PINECONE_INDEX_NAME,
                api_key=config.PINECONE_API_KEY,
                metadata_creator_func=create_reddit_metadata,
                logger=self.logger
            )
            stats['total_items_uploaded'] = uploaded_count

            # Save updated state
            if utils.save_state(self.state_file, self.state):
                self.logger.info(f"Saved state to {self.state_file}")
            else:
                self.logger.error("Failed to save state file")
        else:
            self.logger.info("\nNo new data collected")

        elapsed_time = time.time() - start_time
        stats['execution_time'] = elapsed_time

        self.logger.info("=" * 80)
        self.logger.info(f"Total execution time: {elapsed_time:.2f} seconds")
        self.logger.info("=" * 80)

        return stats


def main():
    """Main entry point."""
    try:
        scraper = RedditIncrementalScraper()
        stats = scraper.run()

        # Print summary
        print("\nRun Summary:")
        print(utils.format_json(stats))

        return stats

    except Exception as e:
        print(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
