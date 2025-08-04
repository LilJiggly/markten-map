# 🏪 How to Update Your Flea Market Website

**A simple guide for non-programmers**

## 🎯 What This Guide Does

Your website shows flea markets on a map. Sometimes new markets are added or old ones are removed from the source website (donevents.nl). This guide shows you how to update your website with the latest information.

## ⏰ When to Update

- **Every week** during market season (August - December)
- **Once a month** during quiet periods
- **When you notice** your website is missing new markets

## 🚀 How to Update (3 Simple Steps)

### Step 1: Get New Market URLs 🔍

1. **Open VS Code** (your coding program)
2. **Find the file** called `gather_urls.py` in the `scrapers` folder
3. **Click the ▶️ play button** at the top right of VS Code
4. **Wait** for it to finish (about 10 seconds)

**What you'll see:**

```
✅ Successfully gathered 48 market URLs
📁 Saved to data/market_urls.json
```

**What this does:** Gets a list of all current markets from the donevents.nl website.

---

### Step 2: Get Market Details 📊

1. **Find the file** called `scrape_markets_enhanced.py` in the `scrapers` folder
2. **Click the ▶️ play button** at the top right of VS Code
3. **Wait** for it to finish (about 2-3 minutes)

**What you'll see:**

```
✅ Enhanced scraping complete!
📊 Total markets: 47
🗺️  Successfully geocoded: 46
📈 Geocoding success rate: 97.9%
```

**What this does:** Gets detailed information (address, date, time, price) for each market and finds their locations on the map.

---

### Step 3: Check Your Website 🌐

1. **Open your web browser** (Chrome, Safari, etc.)
2. **Go to** `localhost:5500` (or whatever port your website runs on)
3. **Refresh the page** (press F5 or click the refresh button)
4. **Check the map** - you should see updated markets!

---

## 🗺️ What If Some Markets Don't Show on the Map?

Sometimes markets don't appear on the map because their address is unclear. Here's how to fix it:

### Step 1: Check If There's a Problem

After Step 2 above, look at the results. If you see something like:

```
🗺️  Successfully geocoded: 45
❌ Failed geocoding: 2
```

This means 2 markets don't have map locations.

### Step 2: Fix the Missing Addresses

1. **Find the file** called `add_address_mapping.py` in the `scrapers` folder
2. **Click the ▶️ play button**
3. **Follow the prompts** - it will show you markets that need fixing

**Example of what you'll see:**

```
1. VLOOIENMARKT Example Market
   Raw location: Sporthal Something
   Somestreet 123
   1234 AB Somewhere
   Link: https://donevents.nl/product/example-market/

   Enter corrected address information:
   Full address for geocoding:
```

### Step 3: Research the Correct Address

**Before typing anything:**

1. **Click the link** shown to see the original market page
2. **Google the venue name** (like "Sporthal Something Somewhere")
3. **Find the correct address** on Google Maps
4. **Write down the full address** with postal code

### Step 4: Enter the Correct Information

**Type the corrected address when asked:**

```
Full address for geocoding: Correctstreet 456, 1234 XY Somewhere
Venue [Sporthal Something]: (press Enter to keep, or type new name)
Street address [Somestreet 123]: Correctstreet 456
Postal code [1234 AB]: 1234 XY
City [Somewhere]: Somewhere
Note (optional): Fixed street name spelling
```

### Step 5: Apply the Fix

1. **Go back to Step 2** (run `scrape_markets_enhanced.py` again)
2. **Check the results** - should now show better success rate
3. **Refresh your website** - the missing markets should now appear!

---

## 🎯 Quick Summary

**Normal update (every week):**

1. ▶️ Run `gather_urls.py`
2. ▶️ Run `scrape_markets_enhanced.py`
3. 🌐 Refresh your website

**If markets are missing from map:**

1. ▶️ Run `add_address_mapping.py`
2. 🔍 Research and fix addresses
3. ▶️ Run `scrape_markets_enhanced.py` again
4. 🌐 Refresh your website

---

## 🆘 Help! Something Went Wrong

### Problem: "No markets found" or very few markets

**What to do:**

- Check if donevents.nl website is working
- Try again in a few minutes
- The website might have changed - contact technical support

### Problem: VS Code won't run the scripts

**What to do:**

- Make sure you clicked on the right file first
- Look for error messages in red text
- Try closing and reopening VS Code

### Problem: Website still shows old information

**What to do:**

- Hard refresh your browser (Ctrl+F5 on Windows, Cmd+Shift+R on Mac)
- Check that the scripts finished successfully
- Wait a few minutes and try again

### Problem: Map is completely empty

**What to do:**

- Check your internet connection
- Make sure your local server is running
- Try refreshing the browser page

---

## 📞 Need More Help?

If you're stuck:

1. **Look at the error messages** - they often tell you what's wrong
2. **Try the steps again** - sometimes it just needs a retry
3. **Check the detailed guide** (MAINTENANCE_GUIDE.md) for more technical info
4. **Contact technical support** if nothing works

---

## 🎉 You're Done!

Congratulations! You've successfully updated your flea market website. Your visitors can now see the latest markets with accurate information and locations.

**Remember:** Update weekly during market season for the best experience!

---

**Last Updated:** August 2025  
**Estimated Time:** 5-10 minutes  
**Difficulty:** Beginner-friendly
