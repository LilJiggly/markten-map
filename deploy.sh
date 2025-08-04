#!/bin/bash

# Deployment script for Nederlandse Vlooienmarkten
# This script prepares the project for deployment

set -e

echo "🚀 Preparing deployment for Nederlandse Vlooienmarkten..."

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Are you in the project root?"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p data

# Check if we have market data
if [ ! -f "data/markets_detailed.json" ]; then
    echo "⚠️  No market data found. Running scrapers..."
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is required for scraping. Please install Python 3."
        exit 1
    fi
    
    # Install Python dependencies
    echo "📦 Installing Python dependencies..."
    cd scrapers
    pip3 install -r requirements.txt
    
    # Run scrapers
    echo "🕷️  Gathering URLs..."
    python3 gather_urls.py
    
    echo "📊 Scraping market data..."
    python3 scrape_markets.py
    
    echo "🧹 Cleaning data..."
    python3 cleanup_data.py
    
    cd ..
else
    echo "✅ Market data found"
fi

# Validate that we have the required files
required_files=("index.html" "script.js" "style.css" "data/markets_detailed.json")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done

echo "✅ All required files present"

# Check data quality
if [ -f "data/markets_detailed.json" ]; then
    market_count=$(python3 -c "import json; data=json.load(open('data/markets_detailed.json')); print(len(data))")
    echo "📊 Found $market_count markets in dataset"
    
    if [ "$market_count" -lt 10 ]; then
        echo "⚠️  Warning: Only $market_count markets found. This seems low."
    fi
fi

# Create a simple health check
cat > health.json << EOF
{
  "status": "healthy",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0.0",
  "markets_count": $market_count
}
EOF

echo "✅ Health check file created"

# If we're deploying to Netlify, show deployment info
if [ -f "netlify.toml" ]; then
    echo ""
    echo "🌐 Netlify deployment configuration found"
    echo "   To deploy:"
    echo "   1. Push to GitHub"
    echo "   2. Connect repository to Netlify"
    echo "   3. Deploy automatically on push"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "📁 Project structure:"
echo "   ├── index.html (main page)"
echo "   ├── script.js (functionality)"
echo "   ├── style.css (styling)"
echo "   ├── data/markets_detailed.json ($market_count markets)"
echo "   └── health.json (health check)"
echo ""
echo "🚀 Ready for deployment!"