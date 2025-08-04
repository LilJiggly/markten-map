#!/usr/bin/env python3
"""
Tool to easily add address mappings for markets with geocoding issues
"""

import json
import sys
from pathlib import Path

def load_mappings():
    """Load existing address mappings"""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    mappings_file = script_dir / "address_mappings.json"
    
    try:
        with open(mappings_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"mappings": {}}

def save_mappings(data):
    """Save address mappings"""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    mappings_file = script_dir / "address_mappings.json"
    
    with open(mappings_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def find_unmapped_addresses():
    """Find markets without coordinates that need mapping"""
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    data_file = script_dir / "data" / "markets_detailed.json"
    
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            markets = json.load(f)
        
        unmapped = []
        for market in markets:
            if market.get("lat") is None:
                unmapped.append({
                    "title": market.get("title", "Unknown"),
                    "location_raw": market.get("location_raw", ""),
                    "venue": market.get("venue", ""),
                    "location_address": market.get("location_address", ""),
                    "postal_code": market.get("postal_code", ""),
                    "city": market.get("city", ""),
                    "link": market.get("link", "")
                })
        
        return unmapped
    except FileNotFoundError:
        print("❌ markets_detailed.json not found. Run scraper first.")
        print(f"Looking for: {data_file}")
        return []

def add_mapping_interactive():
    """Interactive tool to add address mappings"""
    print("🗺️  Address Mapping Tool")
    print("=" * 50)
    
    # Load existing mappings
    data = load_mappings()
    mappings = data["mappings"]
    
    # Find unmapped addresses
    unmapped = find_unmapped_addresses()
    
    if not unmapped:
        print("✅ All markets have coordinates! No mappings needed.")
        return
    
    print(f"Found {len(unmapped)} markets without coordinates:\n")
    
    for i, market in enumerate(unmapped, 1):
        print(f"{i}. {market['title']}")
        print(f"   Raw location: {market['location_raw']}")
        print(f"   Current: {market['venue']} | {market['location_address']} | {market['postal_code']} {market['city']}")
        print(f"   Link: {market['link']}")
        print()
        
        # Check if already mapped
        if market['location_raw'] in mappings:
            print("   ✅ Already mapped!")
            continue
        
        # Ask user for mapping
        print("   Enter corrected address information:")
        corrected_address = input("   Full address for geocoding: ").strip()
        
        if not corrected_address:
            print("   ⏭️  Skipping...")
            continue
        
        venue = input(f"   Venue [{market['venue']}]: ").strip() or market['venue']
        location_address = input(f"   Street address [{market['location_address']}]: ").strip() or market['location_address']
        postal_code = input(f"   Postal code [{market['postal_code']}]: ").strip() or market['postal_code']
        city = input(f"   City [{market['city']}]: ").strip() or market['city']
        note = input("   Note (optional): ").strip()
        
        # Add mapping
        mappings[market['location_raw']] = {
            "corrected_address": corrected_address,
            "venue": venue,
            "location_address": location_address,
            "postal_code": postal_code,
            "city": city,
            "note": note or f"Manually mapped for {market['title']}"
        }
        
        print("   ✅ Mapping added!")
        print()
    
    # Save mappings
    data["mappings"] = mappings
    save_mappings(data)
    
    script_dir = Path(__file__).parent
    mappings_file = script_dir / "address_mappings.json"
    print(f"💾 Saved {len(mappings)} total mappings to {mappings_file}")
    print("🔄 Run the enhanced scraper to apply the new mappings!")

def list_mappings():
    """List all current mappings"""
    data = load_mappings()
    mappings = data["mappings"]
    
    if not mappings:
        print("No address mappings found.")
        return
    
    print(f"📍 Current Address Mappings ({len(mappings)}):")
    print("=" * 50)
    
    for i, (raw_address, mapping) in enumerate(mappings.items(), 1):
        print(f"{i}. Raw: {raw_address}")
        print(f"   → {mapping['corrected_address']}")
        print(f"   Note: {mapping.get('note', 'No note')}")
        print()

def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        list_mappings()
    else:
        add_mapping_interactive()

if __name__ == "__main__":
    main()