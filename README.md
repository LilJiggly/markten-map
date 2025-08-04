# 🏪 Nederlandse Vlooienmarkten

Een interactieve kaart van alle vlooienmarkten in Nederland. Ontdek markten bij jou in de buurt met geavanceerde filters en een gebruiksvriendelijke interface.

## ✨ Features

### 🗺️ Interactieve Kaart

- **Leaflet-powered map** met clustering voor betere performance
- **Marker badges** tonen aantal markten per locatie
- **Click-to-center** functionaliteit met sidebar-aware positioning
- **Responsive design** voor desktop en mobile

### 🔍 Geavanceerde Filters

- **Zoeken** op naam, locatie of venue
- **Maand filter** voor specifieke periodes
- **Locatie filter** met postcode en stad ondersteuning
- **Afstand filter** met coördinaat-gebaseerde berekeningen
- **Prijs filter** (gratis vs betaald)
- **Real-time filtering** met debounced input

### 📱 Mobile-First Design

- **Bottom sidebar** met horizontaal scrollende kaarten
- **Collapsible filters** met smooth slide-in animatie
- **50/50 split** tussen kaart en sidebar
- **Touch-friendly** interface

### 📊 Smart Statistics

- **Dynamic stats bar** in sidebar
- **Filter feedback** toont aantal getoonde markten
- **Location context** bij selectie van markten
- **Total market count** altijd zichtbaar

### 🎯 Location Intelligence

- **Same location grouping** voor markten op dezelfde plek
- **City-based discovery** toont gerelateerde markten
- **Distance calculation** met Haversine formule
- **Postal code mapping** voor Nederlandse postcodes

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/nederlandse-vlooienmarkten.git
cd nederlandse-vlooienmarkten
```

### 2. Setup Python Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Scrape Market Data

```bash
cd scrapers
python gather_urls.py
python scrape_markets_enhanced.py
```

### 4. Launch Website

Open `index.html` in your browser or serve with a local server:

```bash
python -m http.server 8000
```

## 📁 Project Structure

```
nederlandse-vlooienmarkten/
├── index.html              # Main website
├── style.css              # Styling & responsive design
├── script.js              # Interactive functionality
├── scrapers/              # Data collection tools
│   ├── gather_urls.py     # Extract market URLs
│   ├── scrape_markets_enhanced.py  # Scrape market details
│   ├── add_address_mapping.py      # Address correction tool
│   ├── address_mappings.json       # Address corrections
│   └── data/              # Generated market data
├── MAINTENANCE_GUIDE.md   # Technical maintenance guide
├── SIMPLE_UPDATE_GUIDE.html  # User-friendly update guide
└── README.md              # This file
```

## 🛠️ Technical Details

### Frontend Stack

- **HTML5** with semantic structure
- **CSS3** with Flexbox & Grid
- **Vanilla JavaScript** (no frameworks)
- **Leaflet.js** for interactive maps
- **MarkerCluster** for performance

### Data Processing

- **Python 3.8+** for scraping
- **BeautifulSoup4** for HTML parsing
- **Requests** for HTTP requests
- **JSON** for data storage

### Key Features Implementation

#### 🎯 Smart Filtering

```javascript
// Location-based distance filtering
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  // Accurate distance calculation using Earth's curvature
}
```

#### 📍 Postal Code Intelligence

```javascript
// Dutch postal code to coordinates mapping
function getCoordinatesFromPostalCode(postalCode) {
  // Maps 4-digit postal codes to approximate coordinates
}
```

#### 📱 Responsive Design

```css
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
  .sidebar {
    order: 2;
    flex: 1;
  }
  .map-container {
    order: 1;
    flex: 1;
  }
}
```

## 🔄 Data Updates

### Automatic Updates

Run the scraping pipeline to get fresh data:

```bash
cd scrapers
python gather_urls.py && python scrape_markets_enhanced.py
```

### Manual Address Corrections

For geocoding issues, add address mappings:

```bash
python add_address_mapping.py
```

## 🎨 Customization

### Styling

- Modify `style.css` for visual changes
- CSS custom properties for easy theming
- Mobile-first responsive design

### Functionality

- Extend `script.js` for new features
- Modular function structure
- Event-driven architecture

### Data Sources

- Currently scrapes from donevents.nl
- Easily extensible to other sources
- JSON-based data format

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **donevents.nl** for providing market data
- **Leaflet.js** for the mapping library
- **OpenStreetMap** contributors for map tiles
- **Dutch postal code system** for location intelligence

## 📞 Support

For questions or issues:

- Open an issue on GitHub
- Check the maintenance guides in the repository
- Review the technical documentation

---

**Made with ❤️ for the Dutch flea market community**
