#!/usr/bin/env python3
"""
Convenience script to run all scrapers in sequence
"""

import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(e.stderr)
        return False

def main():
    """Main function to run all scrapers"""
    print("🚀 Starting market data collection process...")
    
    # Change to scrapers directory
    scrapers_dir = Path("scrapers")
    if not scrapers_dir.exists():
        print("❌ Scrapers directory not found!")
        sys.exit(1)
    
    # Check if requirements are installed
    try:
        import requests
        import bs4
    except ImportError:
        print("📦 Installing Python requirements...")
        if not run_command("pip install -r scrapers/requirements.txt", "Installing requirements"):
            sys.exit(1)
    
    # Run scrapers in sequence
    commands = [
        ("cd scrapers && python gather_urls.py", "Gathering market URLs"),
        ("cd scrapers && python scrape_markets.py", "Scraping market details"),
        ("cd scrapers && python cleanup_data.py", "Cleaning and validating data")
    ]
    
    for command, description in commands:
        if not run_command(command, description):
            print(f"\n❌ Process failed at: {description}")
            sys.exit(1)
    
    print("\n🎉 All scraping tasks completed successfully!")
    print("\n📊 Summary:")
    
    # Show data summary if available
    try:
        import json
        
        # Check if we have market data
        data_file = Path("data/markets_detailed.json")
        if data_file.exists():
            with open(data_file, 'r', encoding='utf-8') as f:
                markets = json.load(f)
            print(f"   • Total markets: {len(markets)}")
            
            # Check geocoding success
            with_coords = sum(1 for m in markets if m.get('lat') and m.get('lng'))
            print(f"   • With coordinates: {with_coords}")
            print(f"   • Geocoding success: {(with_coords/len(markets)*100):.1f}%")
        
        # Check if cleaned data exists
        clean_data_file = Path("data/markets_detailed_clean.json")
        if clean_data_file.exists():
            print(f"   • Cleaned data: ✅ Available")
        
    except Exception as e:
        print(f"   • Could not read summary: {e}")
    
    print("\n🌐 Ready to serve the website!")
    print("   Run: python -m http.server 8000")
    print("   Then visit: http://localhost:8000")

if __name__ == "__main__":
    main()