#!/usr/bin/env python3
"""
Enhanced Market Data Scraper for Dutch Flea Markets
Includes address mapping functionality for better geocoding
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
import logging
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
import hashlib

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EnhancedMarketScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.geocode_cache = {}
        self.address_mappings = self.load_address_mappings()
        
    def load_address_mappings(self):
        """Load address mappings from JSON file"""
        try:
            with open("address_mappings.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info(f"Loaded {len(data['mappings'])} address mappings")
            return data['mappings']
        except FileNotFoundError:
            logger.warning("No address mappings file found, creating empty mappings")
            return {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in address mappings: {e}")
            return {}
    
    def load_urls(self, filename="data/market_urls.json"):
        """Load URLs from JSON file"""
        try:
            with open(filename, "r", encoding="utf-8") as f:
                urls = json.load(f)
            logger.info(f"Loaded {len(urls)} URLs from {filename}")
            return urls
        except FileNotFoundError:
            logger.error(f"URL file {filename} not found. Run gather_urls.py first.")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {filename}: {e}")
            return []
    
    def fetch_page(self, url, retries=3):
        """Fetch page with retry logic"""
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise
    
    def apply_address_mapping(self, data):
        """Apply address mapping if available"""
        location_raw = data.get("location_raw", "").strip()
        
        if location_raw in self.address_mappings:
            mapping = self.address_mappings[location_raw]
            logger.info(f"Applying address mapping for: {data.get('title', 'Unknown')}")
            
            # Update the data with mapped values
            data["venue"] = mapping.get("venue", data["venue"])
            data["location_address"] = mapping.get("location_address", data["location_address"])
            data["postal_code"] = mapping.get("postal_code", data["postal_code"])
            data["city"] = mapping.get("city", data["city"])
            
            # Use the corrected address for geocoding
            return mapping["corrected_address"]
        
        # Return original address for geocoding
        if data["location_address"] and data["city"]:
            return f"{data['location_address']}, {data['postal_code']} {data['city']}"
        
        return None
    
    def extract_market_data(self, soup, url):
        """Extract market data from soup"""
        data = {
            "title": "",
            "date": "",
            "opening_time": "",
            "entry_fee": "",
            "venue": "",
            "location_address": "",
            "postal_code": "",
            "city": "",
            "location_raw": "",
            "link": url,
            "lat": None,
            "lng": None,
            "scraped_at": datetime.now().isoformat(),
            "address_mapped": False
        }
        
        # Extract title
        title_elem = soup.find("h1")
        if title_elem:
            data["title"] = self.clean_text(title_elem.get_text())
        
        # Extract attributes from WooCommerce product attributes
        raw_date = self.extract_attribute(soup, "attribute_datum")
        data["date"] = self.smart_date_processing(raw_date, data["title"])
        data["opening_time"] = self.extract_attribute(soup, "attribute_openingstijden")
        data["entry_fee"] = self.extract_attribute(soup, "attribute_toegangsprijs")
        
        # Extract location information
        self.extract_location_data(soup, data)
        
        # Apply address mapping and geocode
        corrected_address = self.apply_address_mapping(data)
        if corrected_address:
            if data["location_raw"] in self.address_mappings:
                data["address_mapped"] = True
            data["lat"], data["lng"] = self.geocode_address(corrected_address)
        
        return data
    
    def extract_attribute(self, soup, attribute_name):
        """Extract WooCommerce product attribute"""
        selector = f"tr.woocommerce-product-attributes-item--{attribute_name}"
        item = soup.select_one(selector)
        if item:
            td = item.find("td")
            if td:
                return self.clean_text(td.get_text())
        return ""
    
    def smart_date_processing(self, raw_date, title):
        """Smart date processing with standardized format"""
        if not raw_date:
            return ""
        
        # Clean the raw date
        date_text = self.clean_text(raw_date).lower()
        
        # Month mapping
        month_map = {
            'januari': 'januari', 'jan': 'januari',
            'februari': 'februari', 'feb': 'februari',
            'maart': 'maart', 'mrt': 'maart',
            'april': 'april', 'apr': 'april',
            'mei': 'mei',
            'juni': 'juni', 'jun': 'juni',
            'juli': 'juli', 'jul': 'juli',
            'augustus': 'augustus', 'aug': 'augustus',
            'september': 'september', 'sep': 'september',
            'oktober': 'oktober', 'okt': 'oktober',
            'november': 'november', 'nov': 'november',
            'december': 'december', 'dec': 'december'
        }
        
        # Day of week mapping
        day_map = {
            'maandag': 'maandag', 'ma': 'maandag',
            'dinsdag': 'dinsdag', 'di': 'dinsdag',
            'woensdag': 'woensdag', 'wo': 'woensdag',
            'donderdag': 'donderdag', 'do': 'donderdag',
            'vrijdag': 'vrijdag', 'vr': 'vrijdag',
            'zaterdag': 'zaterdag', 'zat': 'zaterdag', 'za': 'zaterdag',
            'zondag': 'zondag', 'zon': 'zondag', 'zo': 'zondag'
        }
        
        # Extract year from title if date is missing year (fix 2025/2026 inconsistency)
        year = self.extract_year_from_context(date_text, title)
        
        # Extract day numbers
        day_numbers = re.findall(r'\b(\d{1,2})\b', date_text)
        
        # Extract month
        month = None
        for month_variant, standard_month in month_map.items():
            if month_variant in date_text:
                month = standard_month
                break
        
        # Extract day of week
        day_of_week = None
        for day_variant, standard_day in day_map.items():
            if day_variant in date_text:
                day_of_week = standard_day
                break
        
        # Build standardized date format: [day/days of week] [day number/numbers] [month] [year]
        parts = []
        
        # Add day of week if found
        if day_of_week:
            parts.append(day_of_week)
        
        # Add day numbers
        if day_numbers:
            if len(day_numbers) == 1:
                parts.append(day_numbers[0])
            elif len(day_numbers) == 2:
                # Handle ranges like "16&17" or "18 en 19"
                parts.append(f"{day_numbers[0]} & {day_numbers[1]}")
            else:
                # Multiple days, join with &
                parts.append(" & ".join(day_numbers))
        
        # Add month
        if month:
            parts.append(month)
        
        # Smart year adjustment - check if date has passed
        if year and month and day_numbers:
            adjusted_year = self.smart_year_adjustment(year, month, day_numbers[0])
            parts.append(str(adjusted_year))
        elif year:
            parts.append(str(year))
        
        # Join parts and return
        if parts:
            standardized_date = " ".join(parts)
            logger.debug(f"Date standardized: '{raw_date}' → '{standardized_date}'")
            return standardized_date
        
        # Fallback to original if parsing failed
        logger.warning(f"Could not parse date: '{raw_date}', using original")
        return raw_date
    
    def extract_year_from_context(self, date_text, title):
        """Extract year from date text or title, with smart logic for 2025/2026"""
        # First try to find year in date text
        year_match = re.search(r'\b(202[5-6])\b', date_text)
        if year_match:
            return int(year_match.group(1))
        
        # Then try title (prioritize title for year since it's more reliable)
        year_match = re.search(r'\b(202[5-6])\b', title.lower())
        if year_match:
            logger.debug(f"Using year {year_match.group(1)} from title: {title}")
            return int(year_match.group(1))
        
        # Smart logic based on month (since page is in chronological order)
        month_match = re.search(r'\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b', date_text)
        if month_match:
            month = month_match.group(1)
            # January and February are likely 2026 (next year)
            if month in ['januari', 'februari']:
                logger.debug(f"Using year 2026 for month {month}")
                return 2026
            else:
                logger.debug(f"Using year 2025 for month {month}")
                return 2025
        
        # Default to 2025
        logger.debug("Using default year 2025")
        return 2025
    
    def smart_year_adjustment(self, initial_year, month, day):
        """Adjust year if the date has already passed"""
        try:
            # Month name to number mapping
            month_numbers = {
                'januari': 1, 'februari': 2, 'maart': 3, 'april': 4,
                'mei': 5, 'juni': 6, 'juli': 7, 'augustus': 8,
                'september': 9, 'oktober': 10, 'november': 11, 'december': 12
            }
            
            if month not in month_numbers:
                return initial_year
            
            month_num = month_numbers[month]
            day_num = int(day)
            
            # Create the proposed date
            from datetime import date
            today = date.today()
            proposed_date = date(initial_year, month_num, day_num)
            
            # If the proposed date is in the past, increment the year
            if proposed_date < today:
                adjusted_year = initial_year + 1
                logger.info(f"Date adjustment: {month} {day}, {initial_year} has passed, using {adjusted_year}")
                return adjusted_year
            else:
                logger.debug(f"Date {month} {day}, {initial_year} is in the future, keeping year")
                return initial_year
                
        except (ValueError, KeyError) as e:
            logger.warning(f"Could not adjust year for {month} {day}, {initial_year}: {e}")
            return initial_year
    
    def extract_location_data(self, soup, data):
        """Extract and parse location information"""
        # Look for location block
        loc_block = soup.find("div", class_="et_pb_blurb_description")
        if not loc_block:
            return
        
        # Get all text lines
        loc_lines = [self.clean_text(line) for line in loc_block.stripped_strings if line.strip()]
        data["location_raw"] = "\n".join(loc_lines)
        
        if len(loc_lines) >= 3:
            data["venue"] = loc_lines[0]
            data["location_address"] = loc_lines[1]
            
            # Parse postal code and city from third line
            postal_city = loc_lines[2]
            postal_match = re.match(r"(\d{4}\s?[A-Z]{2})\s+(.*)", postal_city)
            if postal_match:
                data["postal_code"] = postal_match.group(1).strip()
                data["city"] = postal_match.group(2).strip()
    
    def geocode_address(self, address):
        """Geocode address with caching"""
        # Create cache key
        cache_key = hashlib.md5(address.encode()).hexdigest()
        
        if cache_key in self.geocode_cache:
            return self.geocode_cache[cache_key]
        
        geo_url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
        
        try:
            logger.debug(f"Geocoding: {address}")
            response = self.session.get(geo_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data:
                lat = float(data[0]["lat"])
                lng = float(data[0]["lon"])
                
                # Cache the result
                self.geocode_cache[cache_key] = (lat, lng)
                
                logger.debug(f"✅ Geocoded: {address} → {lat}, {lng}")
                return lat, lng
            else:
                logger.warning(f"No geocoding results for: {address}")
                
        except Exception as e:
            logger.warning(f"Geocoding failed for {address}: {e}")
        
        # Cache null result to avoid repeated failures
        self.geocode_cache[cache_key] = (None, None)
        return None, None
    
    def clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common unwanted characters
        text = text.replace('\u00a0', ' ')  # Non-breaking space
        text = text.replace('\u2013', '-')  # En dash
        text = text.replace('\u2014', '-')  # Em dash
        
        return text
    
    def validate_market_data(self, data):
        """Validate scraped market data"""
        issues = []
        
        if not data["title"]:
            issues.append("Missing title")
        
        if not data["date"]:
            issues.append("Missing date")
        
        if not data["venue"]:
            issues.append("Missing venue")
        
        if not data["city"]:
            issues.append("Missing city")
        
        if data["lat"] is None or data["lng"] is None:
            issues.append("Missing coordinates")
        
        return issues
    
    def scrape_market(self, url):
        """Scrape a single market"""
        try:
            logger.info(f"Scraping: {url}")
            
            response = self.fetch_page(url)
            soup = BeautifulSoup(response.text, "html.parser")
            
            data = self.extract_market_data(soup, url)
            
            # Validate data
            issues = self.validate_market_data(data)
            if issues:
                status = "✅ MAPPED" if data["address_mapped"] else "⚠️  ISSUES"
                logger.warning(f"{status} for {url}: {', '.join(issues)}")
            elif data["address_mapped"]:
                logger.info(f"✅ Successfully mapped address for: {data['title']}")
            
            # Rate limiting
            time.sleep(1)
            
            return data
            
        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            return None
    
    def scrape_all_markets(self, urls):
        """Scrape all markets"""
        results = []
        failed_urls = []
        mapped_count = 0
        date_fixes = 0
        
        logger.info(f"Starting to scrape {len(urls)} markets")
        logger.info("Using page order as chronological reference for smart date processing")
        
        for i, url in enumerate(urls, 1):
            logger.info(f"Progress: {i}/{len(urls)}")
            
            data = self.scrape_market(url)
            if data:
                # Add page order for reference
                data["page_order"] = i
                results.append(data)
                
                if data.get("address_mapped"):
                    mapped_count += 1
                    
                # Check if date was processed/fixed
                if "standardized" in str(data.get("date", "")):
                    date_fixes += 1
            else:
                failed_urls.append(url)
        
        logger.info(f"Scraping complete: {len(results)} successful, {len(failed_urls)} failed")
        logger.info(f"Address mappings applied: {mapped_count}")
        logger.info(f"Dates processed with smart logic: {len(results)}")
        
        if failed_urls:
            logger.warning("Failed URLs:")
            for url in failed_urls:
                logger.warning(f"  • {url}")
        
        return results
    
    def save_results(self, results, filename="data/markets_detailed_enhanced.json"):
        """Save results to JSON file"""
        # Ensure data directory exists
        Path(filename).parent.mkdir(exist_ok=True)
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(results)} markets to {filename}")
        
        # Save metadata separately
        successful_geocodes = sum(1 for m in results if m["lat"] is not None)
        mapped_addresses = sum(1 for m in results if m.get("address_mapped"))
        
        metadata = {
            "scraped_at": datetime.now().isoformat(),
            "total_markets": len(results),
            "successful_geocodes": successful_geocodes,
            "failed_geocodes": len(results) - successful_geocodes,
            "mapped_addresses": mapped_addresses,
            "geocoding_success_rate": f"{(successful_geocodes/len(results)*100):.1f}%" if results else "0%"
        }
        
        metadata_file = filename.replace('.json', '_metadata.json')
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    
    def run(self):
        """Main scraping workflow"""
        # Load URLs
        urls = self.load_urls()
        if not urls:
            return
        
        # Scrape all markets
        results = self.scrape_all_markets(urls)
        
        if results:
            # Save results
            self.save_results(results)
            
            # Print summary
            successful_geocodes = sum(1 for m in results if m["lat"] is not None)
            mapped_addresses = sum(1 for m in results if m.get("address_mapped"))
            
            print(f"\n✅ Enhanced scraping complete!")
            print(f"📊 Total markets: {len(results)}")
            print(f"🗺️  Successfully geocoded: {successful_geocodes}")
            print(f"🔧 Address mappings used: {mapped_addresses}")
            print(f"❌ Failed geocoding: {len(results) - successful_geocodes}")
            print(f"📈 Geocoding success rate: {(successful_geocodes/len(results)*100):.1f}%")
            print(f"📁 Saved to: data/markets_detailed_enhanced.json")
        else:
            print("❌ No markets were successfully scraped")

def main():
    """Main function"""
    scraper = EnhancedMarketScraper()
    scraper.run()

if __name__ == "__main__":
    main()