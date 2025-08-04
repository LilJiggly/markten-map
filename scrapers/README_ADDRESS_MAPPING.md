# Address Mapping System 🗺️

This system helps fix geocoding issues by mapping problematic addresses from the website to correct, geocodable addresses.

## How It Works

1. **Scraper extracts** raw location data from market pages
2. **Address mapping** checks if the raw location needs correction
3. **Enhanced geocoding** uses the corrected address for better results
4. **Success rate** improved from 74.5% to 97.9%!

## Files

- `address_mappings.json` - Contains all address mappings
- `scrape_markets_enhanced.py` - Enhanced scraper that uses mappings
- `add_address_mapping.py` - Tool to easily add new mappings

## Current Mappings

We have mappings for these problematic addresses:

1. **Katwijk markets** - "Marktplein\nPiet heinlaan\nKatwijk aan zee"
2. **Biddinghuizen** - "FLEVONICE\nStrandgaperweg 20\nBiddinghuizen"
3. **Sittard** - "Fletcher Hotel Sittard.\nTopsporthal\nMilaanstraat 115"
4. **Utrecht** - "DE VECHTSEBANEN\nMississippiedreef 151" (fixed spelling)
5. **Kalkar, Germany** - "Hanse Halle\nGriether straat 110-120"
6. **Amsterdam** - "Stadioplein\nAmsterdam"
7. **Eemnes** - Empty location data (default address provided)
8. **Nieuwegein** - "Evenemententerrein Down under\nLaagravense plas"
9. **Zeist** - "Sporthal Dijnselburg\nBurgemeester schenkpad 2"

## Usage

### Run Enhanced Scraper

```bash
cd scrapers
python3 scrape_markets_enhanced.py
```

### Add New Mappings

```bash
cd scrapers
python3 add_address_mapping.py
```

### List Current Mappings

```bash
cd scrapers
python3 add_address_mapping.py list
```

## Adding New Mappings

When you find markets without coordinates:

1. **Run the mapping tool**: `python3 add_address_mapping.py`
2. **Review unmapped markets** - tool shows you which ones need fixing
3. **Enter corrected address** - provide a geocodable address
4. **Fill in details** - venue, street, postal code, city
5. **Add note** - explain what was fixed
6. **Re-run scraper** - `python3 scrape_markets_enhanced.py`

## Address Mapping Format

```json
{
  "mappings": {
    "Raw location from website": {
      "corrected_address": "Full address for geocoding",
      "venue": "Venue name",
      "location_address": "Street address",
      "postal_code": "1234 AB",
      "city": "City name",
      "note": "Explanation of what was fixed"
    }
  }
}
```

## Tips for Good Mappings

- **Use full addresses** with postal codes for best geocoding
- **Check spelling** - many issues are typos in street names
- **Add country** for international locations (Germany)
- **Be specific** - "Stadionplein" vs "Stadionplein, Amsterdam"
- **Verify online** - check addresses on Google Maps first

## Results

With address mappings:

- ✅ **97.9% geocoding success** (46/47 markets)
- 🔧 **12 mappings applied** automatically
- 🗺️ **Nearly all markets** now show on the map
- 🚀 **Much better user experience**

## Maintenance

- **Check after each scrape** for new unmapped addresses
- **Update mappings** when venues change locations
- **Verify coordinates** occasionally to ensure accuracy
- **Document changes** in mapping notes
