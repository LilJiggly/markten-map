# 🔄 Flea Market Website Maintenance Guide

This guide explains how to update your website when new markets are added or old ones are removed from donevents.nl.

## 📅 When to Update

Update your website:

- **Weekly** during market season (August-December)
- **Monthly** during off-season
- **Immediately** when you notice missing markets on your site
- **After major events** when many markets get added/removed

## 🚀 Complete Update Process

Follow these steps **in order** every time you want to update:

### Step 1: Gather New URLs 🔍

```bash
cd scrapers
python3 gather_urls.py
```

**What this does:**

- Scrapes https://donevents.nl/marktkalender/ for all market URLs
- Saves new list to `data/market_urls.json`
- Shows you how many URLs were found

**Expected output:**

```
✅ Successfully gathered X market URLs
📁 Saved to data/market_urls.json
```

### Step 2: Scrape Market Details 📊

```bash
python3 scrape_markets_enhanced.py
```

**What this does:**

- Visits each market URL to get detailed information
- Applies your address mappings for better geocoding
- Saves enhanced data to `data/markets_detailed_enhanced.json`

**Expected output:**

```
✅ Enhanced scraping complete!
📊 Total markets: X
🗺️  Successfully geocoded: X
🔧 Address mappings used: X
📈 Geocoding success rate: X%
```

### Step 3: Check for New Geocoding Issues 🗺️

If you see markets without coordinates (geocoding success < 100%):

```bash
python3 add_address_mapping.py
```

**What this does:**

- Shows you markets that need address mapping
- Guides you through adding corrections
- Updates `address_mappings.json`

**If new mappings were added, re-run Step 2:**

```bash
python3 scrape_markets_enhanced.py
```

### Step 4: Clean Up Data 🧹

```bash
python3 cleanup_data.py
```

**What this does:**

- Removes duplicates
- Standardizes text formatting
- Validates data quality
- Creates final clean dataset

### Step 5: Update Your Website 🌐

**Refresh your local server** (port 5500) or **restart it**:

- Your website automatically loads the newest data
- Check that new markets appear on the map
- Verify old/expired markets are gone

## 🔧 Troubleshooting Common Issues

### Problem: "No URLs found" or very few URLs

**Solution:**

- Check if donevents.nl website structure changed
- Look at the actual calendar page in your browser
- May need to update the URL extraction logic

### Problem: Many markets missing coordinates

**Solution:**

- Run the address mapping tool: `python3 add_address_mapping.py`
- Add mappings for problematic addresses
- Re-run the enhanced scraper
- See detailed guide below ⬇️

### Problem: Website shows old data

**Solution:**

- Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
- Check that files in `scrapers/data/` have recent timestamps
- Restart your local server

### Problem: Scraper fails with errors

**Solution:**

- Check your internet connection
- Wait a few minutes (might be rate limiting)
- Try running individual steps to isolate the issue

## 📋 Quick Checklist

For regular updates, just run these 4 commands:

```bash
cd scrapers
python3 gather_urls.py
python3 scrape_markets_enhanced.py
python3 cleanup_data.py
# Refresh your website
```

## 📊 What to Expect

**Typical numbers:**

- **URLs found:** 40-60 markets (varies by season)
- **Geocoding success:** 95-100% (thanks to address mappings)
- **Update time:** 2-5 minutes total
- **New markets per week:** 0-10 (depends on season)

## 🚨 When Something Goes Wrong

If the scrapers completely fail:

1. **Check the source website:** Visit https://donevents.nl/marktkalender/
2. **Look for changes:** Did they change their layout or URL structure?
3. **Check error messages:** Run scrapers individually to see specific errors
4. **Backup plan:** Use your existing data until issues are resolved

## 📁 Important Files

**Don't delete these:**

- `scrapers/address_mappings.json` - Your address corrections
- `scrapers/data/markets_detailed_enhanced.json` - Latest market data
- `script.js` - Website functionality
- `index.html` - Website structure

**Safe to delete:**

- `scrapers/data/markets_detailed.json` - Raw scraped data
- `scrapers/data/markets_detailed_clean.json` - Intermediate cleaned data

## 🎯 Pro Tips

- **Run updates in the evening** - less traffic, more reliable
- **Check the website after updating** - make sure everything looks good
- **Keep notes** of any new address mappings you add
- **Monitor geocoding success rate** - should stay above 95%
- **Update more frequently during peak season** (September-November)

## 📞 Emergency Contacts

If something breaks and you can't fix it:

- **Check GitHub Issues** for similar problems
- **Look at error logs** in terminal output
- **Try running older versions** of the scrapers
- **Use cached data** until issues are resolved

---

**Last Updated:** August 2025  
**Estimated Update Time:** 2-5 minutes  
**Recommended Frequency:** Weekly during season, Monthly off-season

## 🗺️ How to Fix Missing Addresses (Detailed Guide)

When markets don't show up on your map, it's usually because they don't have coordinates. Here's exactly how to fix this:

### Step 1: Identify Markets Without Coordinates

After running the scraper, look for this in the output:

```
🗺️  Successfully geocoded: 45
❌ Failed geocoding: 2
📈 Geocoding success rate: 95.7%
```

If success rate is less than 100%, you have markets without coordinates.

### Step 2: Run the Address Mapping Tool

```bash
cd scrapers
python3 add_address_mapping.py
```

### Step 3: Follow the Interactive Prompts

The tool will show you something like:

```
🗺️  Address Mapping Tool
==================================================
Found 2 markets without coordinates:

1. VLOOIENMARKT Example Market
   Raw location: Sporthal Something
   Somestreet 123
   1234 AB Somewhere
   Current: Sporthal Something | Somestreet 123 | 1234 AB Somewhere
   Link: https://donevents.nl/product/example-market/

   Enter corrected address information:
   Full address for geocoding:
```

### Step 4: Research the Correct Address

**Before entering anything, do this:**

1. **Click the market link** to see the original page
2. **Google the venue name** (e.g., "Sporthal Something Somewhere")
3. **Check Google Maps** for the exact address
4. **Look for the venue's official website**

### Step 5: Enter the Corrected Information

**Example of what to enter:**

```
Full address for geocoding: Correctstreet 456, 1234 XY Somewhere
Venue [Sporthal Something]: Sporthal Something
Street address [Somestreet 123]: Correctstreet 456
Postal code [1234 AB]: 1234 XY
City [Somewhere]: Somewhere
Note (optional): Fixed street name - was misspelled on website
```

### Step 6: Apply the Fix

After adding mappings:

1. **Re-run the enhanced scraper:**

   ```bash
   python3 scrape_markets_enhanced.py
   ```

2. **Check the results:**

   ```
   🔧 Address mappings used: 3
   📈 Geocoding success rate: 100.0%
   ```

3. **Refresh your website** - the market should now appear on the map!

### Common Address Issues and Fixes

**Issue:** Street name misspelled

- **Example:** "Burgemeester" vs "Badmeester"
- **Fix:** Look up the correct spelling online

**Issue:** Missing postal code

- **Example:** "Marktplein, Amsterdam"
- **Fix:** Add postal code: "Marktplein, 1012 Amsterdam"

**Issue:** Venue name only, no address

- **Example:** "Sporthal De Brug"
- **Fix:** Google the venue: "Sporthal De Brug Hoofdstraat 1, 1234 AB City"

**Issue:** Foreign address (Germany)

- **Example:** "Hanse Halle, Kalkar"
- **Fix:** Add country: "Hanse Halle, 47546 Kalkar, Germany"

**Issue:** Incomplete address

- **Example:** "Evenemententerrein"
- **Fix:** Find full address: "Evenemententerrein Name, Street 1, 1234 AB City"

### Tips for Good Address Mappings

✅ **Do:**

- Use complete addresses with postal codes
- Double-check spelling on Google Maps
- Add country for international venues
- Include building/venue names when helpful
- Add explanatory notes

❌ **Don't:**

- Guess addresses without verifying
- Use abbreviations that might confuse geocoding
- Skip postal codes (very important in Netherlands)
- Forget to re-run the scraper after adding mappings

### Verification

After fixing addresses:

1. **Check your map** - new markets should appear
2. **Click the markers** - verify the location looks correct
3. **Count total markets** - should match the scraper output
4. **Save your work** - the mappings are automatically saved

### Example: Complete Fix Process

```bash
# 1. Run scraper and see geocoding issues
python3 scrape_markets_enhanced.py
# Output: Successfully geocoded: 45, Failed: 2

# 2. Fix the addresses
python3 add_address_mapping.py
# Follow prompts to add 2 address mappings

# 3. Re-run scraper with fixes
python3 scrape_markets_enhanced.py
# Output: Successfully geocoded: 47, Failed: 0

# 4. Refresh website - all markets now visible!
```

This process typically takes 5-10 minutes per problematic address.
