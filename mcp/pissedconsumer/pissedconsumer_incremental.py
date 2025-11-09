#!/usr/bin/env python3
"""
PissedConsumer Incremental Scraper for T-Time Dashboard

Fetches new reviews since the last scrape,
performs sentiment analysis, generates embeddings, and uploads to Pinecone.
Designed to be called periodically or via API.
"""

import requests
from bs4 import BeautifulSoup
import time
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
import config
import utils


def create_pissedconsumer_metadata(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create standardized metadata for a PissedConsumer review.

    Args:
        item: A dictionary containing scraped review data.

    Returns:
        A metadata dictionary ready for Pinecone.
    """
    metadata = {
        'source_platform': config.SOURCE_PLATFORM,
        'source_type': config.SOURCE_TYPE,
        'source_identifier': item['id'],
        'post_type': 'review',
        'upvotes': item.get('helpful_count', 0),
        'timestamp': item['timestamp'],
        'datetime': datetime.fromtimestamp(item['timestamp']).isoformat(),
        'sentiment_score': item['sentiment']['sentiment_value'],
        'sentiment_label': item['sentiment']['label'],
        'author': item['author'],
        'url': item['url'],
        'rating': item.get('rating', 1.0),
        'business_name': config.BUSINESS_NAME,
        'review_source': 'PissedConsumer'
    }

    # Use structured location from author profile if available
    author_location = item.get('author_location')
    if author_location:
        # Parse the structured location (e.g., "Los Angeles, CA")
        parts = [p.strip() for p in author_location.split(',')]
        if len(parts) == 2:
            metadata['location_city'] = parts[0]
            metadata['location_state'] = parts[1]
            metadata['location_raw'] = author_location

            # Determine country based on state/province
            state_lower = parts[1].lower()
            if state_lower in utils.US_STATES or state_lower in utils.US_STATE_ABBR:
                metadata['location_country'] = 'USA'
            elif parts[1] in ['Quebec', 'Ontario', 'BC', 'Alberta', 'Manitoba', 'Saskatchewan']:
                metadata['location_country'] = 'Canada'

        elif len(parts) == 1:
            # Just state/province
            metadata['location_state'] = parts[0]
            metadata['location_raw'] = author_location

    # Fallback: Extract location from review text using NER if no structured location
    elif not author_location:
        location = utils.extract_location(item['text'])
        if location['location_state']:  # Only add if state detected
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


class PissedConsumerIncrementalScraper:
    def __init__(self, state_file: str = "last_scrape_state.json"):
        """
        Initialize the PissedConsumer incremental scraper.

        Args:
            state_file: Path to file storing last scrape timestamp
        """
        # Setup logger
        self.logger = utils.setup_logger("pissedconsumer_incremental")
        self.logger.info("Initializing PissedConsumer Incremental Scraper...")

        # Initialize ML models
        utils.init_sentiment_analyzer()
        utils.init_embedding_model()
        utils.init_pinecone(config.PINECONE_API_KEY)

        # Session for requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': config.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })

        self.state_file = state_file
        self.state = utils.load_state(self.state_file)
        if self.state:
            self.logger.info(f"Loaded state from {self.state_file}")
        else:
            self.logger.info("No previous state file found, starting fresh")

        self.collected_data = []
        self.skipped_count = 0
        self.error_count = 0

    def parse_review_date(self, date_str: str) -> float:
        """Parse date string to timestamp."""
        try:
            for fmt in ['%Y-%m-%d %H:%M:%S', '%B %d, %Y', '%b %d, %Y', '%m/%d/%Y', '%Y-%m-%d']:
                try:
                    dt = datetime.strptime(date_str.strip(), fmt)
                    return dt.timestamp()
                except ValueError:
                    continue
            self.logger.warning(f"Could not parse date '{date_str}'")
            return time.time()
        except Exception as e:
            self.logger.warning(f"Error parsing date '{date_str}': {e}")
            return time.time()

    def scrape_new_reviews(self, last_timestamp: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Scrape new reviews since last timestamp.

        Args:
            last_timestamp: Unix timestamp of last scrape (None for first run)

        Returns:
            List of collected review data items
        """
        self.logger.info("=" * 80)
        self.logger.info("Scraping new reviews from PissedConsumer")
        self.logger.info("=" * 80)

        if last_timestamp:
            last_time = datetime.fromtimestamp(last_timestamp).strftime('%Y-%m-%d %H:%M:%S')
            self.logger.info(f"Looking for reviews since: {last_time}")
        else:
            self.logger.info("First run - scraping first 3 pages")

        collected_items = []
        max_pages = 3 if last_timestamp is None else 10  # Check more pages for incremental

        for page_num in range(1, max_pages + 1):
            # Construct page URL
            if page_num == 1:
                url = config.REVIEWS_URL
            else:
                url = f"{config.REVIEWS_URL}?page={page_num}"

            try:
                self.logger.info(f"Checking page {page_num}...")
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')

                # Find review containers
                review_containers = soup.find_all('div', class_='f-component-item', id=lambda x: x and x.startswith('review-'))

                if not review_containers:
                    self.logger.info(f"No reviews found on page {page_num}, stopping.")
                    break

                new_reviews_on_page = 0
                for container in review_containers:
                    try:
                        # Extract date first to check if we should continue
                        date_elem = container.find('time')
                        if date_elem:
                            date_str = date_elem.get('datetime') or date_elem.get_text(strip=True)
                            timestamp = self.parse_review_date(date_str)
                        else:
                            timestamp = time.time()

                        # If we have a last timestamp, skip older reviews
                        if last_timestamp and timestamp <= last_timestamp:
                            continue

                        new_reviews_on_page += 1

                        # Extract title
                        title = container.get('aria-label', '').strip()
                        if not title:
                            continue

                        # Extract text
                        text_elem = container.find('div', class_='f-component-text')
                        review_text = text_elem.get_text(strip=True) if text_elem else ""
                        full_text = f"{title}. {review_text}" if review_text else title

                        if len(full_text) < 20:
                            self.skipped_count += 1
                            continue

                        # Extract author
                        author_elem = container.find('span', {'itemprop': 'author'})
                        if author_elem:
                            author_name_elem = author_elem.find('span', {'itemprop': 'name'})
                            author = author_name_elem.get_text(strip=True) if author_name_elem else 'Anonymous'
                        else:
                            author = 'Anonymous'

                        # Extract location from location-line class
                        author_location = None
                        location_elem = container.find(class_='location-line')
                        if location_elem:
                            author_location = location_elem.get_text(strip=True)

                        # Extract rating
                        rating = 1.0
                        rating_elem = container.find('meta', {'itemprop': 'ratingValue'})
                        if rating_elem:
                            rating = float(rating_elem.get('content', 1.0))

                        # Extract helpful count
                        helpful_elem = container.find('button', string=re.compile(r'Helpful|Useful', re.I))
                        helpful_count = 0
                        if helpful_elem:
                            helpful_text = helpful_elem.get_text()
                            match = re.search(r'(\d+)', helpful_text)
                            if match:
                                helpful_count = int(match.group(1))

                        # Build URL
                        data_id = container.get('data-id')
                        review_url = f"https://www.pissedconsumer.com/tmobile/review-{data_id}.html" if data_id else config.REVIEWS_URL

                        # Analyze sentiment
                        sentiment = utils.analyze_sentiment(full_text)

                        # Create review data
                        review_data = {
                            'id': data_id or f"pc_{int(timestamp)}",
                            'text': full_text,
                            'rating': rating,
                            'author': author,
                            'author_location': author_location,  # Store structured location
                            'timestamp': timestamp,
                            'helpful_count': helpful_count,
                            'url': review_url,
                            'sentiment': sentiment
                        }

                        collected_items.append(review_data)

                    except Exception as e:
                        self.logger.warning(f"Error processing review: {e}")
                        self.error_count += 1
                        continue

                self.logger.info(f"Found {new_reviews_on_page} new reviews on page {page_num}")

                # If no new reviews on this page, we've reached old content
                if new_reviews_on_page == 0:
                    self.logger.info("No new reviews found, stopping pagination.")
                    break

                # Rate limiting
                time.sleep(config.RATE_LIMIT_DELAY)

            except Exception as e:
                self.logger.error(f"Error scraping page {page_num}: {e}")
                self.error_count += 1
                break

        self.logger.info("=" * 80)
        self.logger.info(f"Collected {len(collected_items)} new reviews")
        self.logger.info(f"Skipped: {self.skipped_count} | Errors: {self.error_count}")
        self.logger.info("=" * 80)

        return collected_items

    def run(self) -> Dict[str, Any]:
        """
        Run the incremental scraper.

        Returns:
            Dictionary with run statistics
        """
        self.logger.info("=" * 80)
        self.logger.info("Starting PissedConsumer Incremental Scraper")
        self.logger.info("=" * 80)

        start_time = time.time()
        current_timestamp = time.time()

        stats = {
            'total_items_collected': 0,
            'total_items_uploaded': 0,
            'errors': 0,
            'timestamp': current_timestamp,
            'datetime': datetime.fromtimestamp(current_timestamp).isoformat()
        }

        # Get last timestamp
        last_timestamp = self.state.get('last_scrape_timestamp')

        # Scrape new reviews
        all_data = self.scrape_new_reviews(last_timestamp)
        stats['total_items_collected'] = len(all_data)
        stats['errors'] = self.error_count

        # Process and upload
        if all_data:
            # Upload to Pinecone
            uploaded_count = utils.process_and_upload_to_pinecone(
                data_items=all_data,
                source_platform='pissedconsumer',
                index_name=config.PINECONE_INDEX_NAME,
                api_key=config.PINECONE_API_KEY,
                metadata_creator_func=create_pissedconsumer_metadata,
                logger=self.logger
            )
            stats['total_items_uploaded'] = uploaded_count

            # Update state with current timestamp
            self.state['last_scrape_timestamp'] = current_timestamp
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
        scraper = PissedConsumerIncrementalScraper()
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
