#!/usr/bin/env python3
"""
URL Gatherer for Dutch Flea Markets
Scrapes market URLs from donevents.nl calendar page
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import logging
from pathlib import Path
from urllib.parse import urljoin, urlparse
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class URLGatherer:
    def __init__(self):
        self.base_url = "https://donevents.nl/marktkalender/"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def fetch_page(self, url, retries=3):
        """Fetch page with retry logic"""
        for attempt in range(retries):
            try:
                logger.info(f"Fetching {url} (attempt {attempt + 1})")
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    raise
    
    def extract_market_urls(self, soup):
        """Extract market URLs from the calendar page"""
        links = []
        
        # Method 1: Look for sections with market links
        for section in soup.find_all("div", class_="et_pb_section"):
            classes = section.get("class", [])
            for cls in classes:
                match = re.match(r"et_pb_section_(\d+)$", cls)
                if match:
                    number = int(match.group(1))
                    if number > 2:  # Skip header sections
                        a_tag = section.find("a", href=True)
                        if a_tag and self.is_valid_market_url(a_tag["href"]):
                            links.append(a_tag["href"])
        
        # Method 2: Look for direct product links
        product_links = soup.find_all("a", href=re.compile(r"/product/.*"))
        for link in product_links:
            href = link.get("href")
            if href and self.is_valid_market_url(href):
                full_url = urljoin(self.base_url, href)
                links.append(full_url)
        
        return links
    
    def is_valid_market_url(self, url):
        """Check if URL is a valid market URL"""
        if not url:
            return False
            
        # Convert relative URLs to absolute
        if url.startswith('/'):
            url = urljoin(self.base_url, url)
        
        parsed = urlparse(url)
        
        # Must be from donevents.nl
        if parsed.netloc != 'donevents.nl':
            return False
            
        # Must be a product page
        if not parsed.path.startswith('/product/'):
            return False
            
        # Filter out unwanted products
        unwanted_keywords = ['workshop', 'cursus', 'training', 'webinar']
        path_lower = parsed.path.lower()
        
        return not any(keyword in path_lower for keyword in unwanted_keywords)
    
    def clean_and_deduplicate(self, urls):
        """Clean URLs and remove duplicates"""
        cleaned = []
        seen = set()
        
        for url in urls:
            # Normalize URL
            if url.startswith('/'):
                url = urljoin(self.base_url, url)
            
            # Remove query parameters and fragments
            parsed = urlparse(url)
            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            
            if clean_url not in seen:
                seen.add(clean_url)
                cleaned.append(clean_url)
        
        return sorted(cleaned)
    
    def save_urls(self, urls, filename="data/market_urls.json"):
        """Save URLs to JSON file"""
        # Ensure data directory exists
        Path(filename).parent.mkdir(exist_ok=True)
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(urls, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(urls)} URLs to {filename}")
    
    def gather_urls(self):
        """Main method to gather all market URLs"""
        try:
            # Fetch the calendar page
            response = self.fetch_page(self.base_url)
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Extract URLs
            raw_urls = self.extract_market_urls(soup)
            logger.info(f"Found {len(raw_urls)} raw URLs")
            
            # Clean and deduplicate
            clean_urls = self.clean_and_deduplicate(raw_urls)
            logger.info(f"After cleaning: {len(clean_urls)} unique URLs")
            
            # Save to file
            self.save_urls(clean_urls)
            
            return clean_urls
            
        except Exception as e:
            logger.error(f"Failed to gather URLs: {e}")
            raise

def main():
    """Main function"""
    gatherer = URLGatherer()
    urls = gatherer.gather_urls()
    
    print(f"\n✅ Successfully gathered {len(urls)} market URLs")
    print("📁 Saved to data/market_urls.json")
    
    # Show sample URLs
    if urls:
        print("\n📋 Sample URLs:")
        for url in urls[:5]:
            print(f"  • {url}")
        if len(urls) > 5:
            print(f"  ... and {len(urls) - 5} more")

if __name__ == "__main__":
    main()