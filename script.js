// Global variables
let map;
let markersCluster;
let allMarkets = [];
let filteredMarkets = [];
let marketMarkers = new Map(); // Store markers by market ID
let highlightedMarker = null;
let currentLocationGroup = []; // Store currently grouped markets

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeMap();
  loadMarketData();
  setupEventListeners();
});

// Initialize the map
function initializeMap() {
  map = L.map("map", {
    center: [52.1, 5.1],
    zoom: 7,
    zoomControl: false,
  });

  // Add zoom control to top right
  L.control
    .zoom({
      position: "topright",
    })
    .addTo(map);

  // Add tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  // Initialize marker cluster group with better decluttering
  markersCluster = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 20, // Even smaller clustering distance
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    spiderfyDistanceMultiplier: 2, // Spread markers further apart
    disableClusteringAtZoom: 15, // Disable clustering at high zoom levels
  });

  map.addLayer(markersCluster);

  // Add click handler to map to clear selections
  map.on("click", function (e) {
    // Only clear if clicking on empty space (not on a marker)
    if (!e.originalEvent.target.closest(".market-marker")) {
      clearAllHighlights();
    }
  });
}

// Load market data
async function loadMarketData() {
  try {
    // Try to load cleaned data first, fallback to regular data
    let response;
    try {
      response = await fetch("scrapers/data/markets_detailed_enhanced.json");
      if (!response.ok) throw new Error("Enhanced data not found");
    } catch {
      try {
        response = await fetch("scrapers/data/markets_detailed_clean.json");
        if (!response.ok) throw new Error("Cleaned data not found");
      } catch {
        response = await fetch("scrapers/data/markets_detailed.json");
      }
    }

    const data = await response.json();

    // Clean and process data
    allMarkets = data
      .filter(
        (market) =>
          market.lat &&
          market.lng &&
          typeof market.lat === "number" &&
          typeof market.lng === "number"
      )
      .map((market) => ({
        ...market,
        searchText:
          `${market.title} ${market.city} ${market.venue} ${market.location_address}`.toLowerCase(),
        isPaid:
          market.entry_fee &&
          !market.entry_fee.toLowerCase().includes("gratis"),
        monthName: extractMonth(market.date),
      }));

    filteredMarkets = [...allMarkets];

    updateStats();
    displayMarkers();
    displayMarketCards();
    hideLoading();
  } catch (error) {
    console.error("Error loading market data:", error);
    hideLoading();
    showError("Er is een fout opgetreden bij het laden van de marktgegevens.");
  }
}

// Extract month from date string
function extractMonth(dateString) {
  if (!dateString) return "";

  const months = {
    augustus: "augustus",
    september: "september",
    oktober: "oktober",
    november: "november",
    december: "december",
    januari: "januari",
    februari: "februari",
  };

  const lowerDate = dateString.toLowerCase();
  for (const [key, value] of Object.entries(months)) {
    if (lowerDate.includes(key)) {
      return value;
    }
  }
  return "";
}

// Display markers on map
function displayMarkers() {
  markersCluster.clearLayers();
  marketMarkers.clear();

  // Group markets by location to add count badges
  const locationGroups = groupMarketsByLocation();

  filteredMarkets.forEach((market, index) => {
    const locationGroup = locationGroups.find((group) =>
      group.indices.includes(index)
    );
    const marketCount = locationGroup ? locationGroup.indices.length : 1;

    const marker = createMarker(market, index, marketCount);
    markersCluster.addLayer(marker);
    marketMarkers.set(index, marker);
  });

  // Fit bounds if we have markers
  if (filteredMarkets.length > 0) {
    const group = L.featureGroup(Object.values(markersCluster.getLayers()));
    if (group.getBounds().isValid()) {
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}

// Create individual marker
function createMarker(market, index, marketCount = 1) {
  const markerClass = market.isPaid ? "paid" : "free";
  const countBadge =
    marketCount > 1
      ? `<div class="marker-count-badge">${marketCount}</div>`
      : "";

  const icon = L.divIcon({
    className: "market-marker-container",
    html: `<div class="market-marker ${markerClass}" data-market-index="${index}">🏪${countBadge}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const marker = L.marker([market.lat, market.lng], { icon });

  // Add click event to highlight card, scroll to it, and zoom
  marker.on("click", function () {
    highlightLocationGroup(index);
    centerMapOnMarker(index);
  });

  return marker;
}

// Display market cards in sidebar
function displayMarketCards() {
  const marketCardsContainer = document.getElementById("marketCards");

  // Clear existing cards
  marketCardsContainer.innerHTML = "";

  // Sort markets by date (upcoming first)
  const sortedMarkets = sortMarketsByDate([...filteredMarkets]);

  // Create cards for sorted markets
  sortedMarkets.forEach((market, sortedIndex) => {
    // Find the original index in filteredMarkets for marker mapping
    const originalIndex = filteredMarkets.findIndex(
      (m) => m.title === market.title && m.link === market.link
    );

    const card = createMarketCard(market, originalIndex, sortedIndex);
    marketCardsContainer.appendChild(card);
  });
}

// Create individual market card
function createMarketCard(market, originalIndex, sortedIndex) {
  const card = document.createElement("div");
  card.className = "market-card";
  card.dataset.marketIndex = originalIndex;
  card.dataset.sortedIndex = sortedIndex;

  // Check if market is this week
  const marketDate = parseMarketDate(market.date);
  const isThisWeek = isMarketThisWeek(marketDate);

  // Add upcoming class if this week
  if (isThisWeek) {
    card.classList.add("upcoming");
  }

  // Create tags for above title
  const tags = [];
  if (isThisWeek) {
    tags.push('<span class="market-tag upcoming-tag">🔥 Binnenkort</span>');
  }

  card.innerHTML = `
    ${market.isPaid ? '<div class="market-card-badge paid">Betaald</div>' : ""}
    ${tags.length > 0 ? `<div class="market-tags">${tags.join("")}</div>` : ""}
    <div class="market-card-title">${market.title}</div>
    <div class="market-card-info">
      <div class="market-card-item">
        <span class="market-card-icon">📍</span>
        <span><strong>${market.venue || "Locatie onbekend"}</strong></span>
      </div>
      <div class="market-card-item">
        <span class="market-card-icon">📬</span>
        <span>${market.location_address}${
    market.postal_code ? ", " + market.postal_code : ""
  } ${market.city}</span>
      </div>
      <div class="market-card-item">
        <span class="market-card-icon">🗓️</span>
        <span>${market.date}</span>
      </div>
      <div class="market-card-item">
        <span class="market-card-icon">⏰</span>
        <span>${market.opening_time}</span>
      </div>
      <div class="market-card-item">
        <span class="market-card-icon">💰</span>
        <span>${market.entry_fee}</span>
      </div>
    </div>
  `;

  // Add click event to highlight location group and center map
  card.addEventListener("click", function () {
    highlightLocationGroup(originalIndex);
    centerMapOnMarker(originalIndex);
  });

  return card;
}

// Highlight market card and remove previous highlights
function highlightMarketCard(index) {
  // Remove previous highlights
  document.querySelectorAll(".market-card.highlighted").forEach((card) => {
    card.classList.remove("highlighted");
  });

  // Highlight the selected card
  const card = document.querySelector(`[data-market-index="${index}"]`);
  if (card) {
    card.classList.add("highlighted");
  }
}

// Scroll to market card in sidebar
function scrollToMarketCard(index) {
  const card = document.querySelector(`[data-market-index="${index}"]`);
  if (card) {
    card.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

// Highlight marker on map
function highlightMarker(index) {
  // Remove previous marker highlights
  if (highlightedMarker) {
    const prevIcon = highlightedMarker.getIcon();
    const prevHtml = prevIcon.options.html.replace(" highlighted", "");
    highlightedMarker.setIcon(
      L.divIcon({
        ...prevIcon.options,
        html: prevHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    );
  }

  // Highlight the selected marker
  const marker = marketMarkers.get(index);
  if (marker) {
    const icon = marker.getIcon();
    const newHtml = icon.options.html.replace(
      "market-marker",
      "market-marker highlighted"
    );
    marker.setIcon(
      L.divIcon({
        ...icon.options,
        html: newHtml,
        iconSize: [48, 48], // Make highlighted marker even bigger
        iconAnchor: [24, 24],
      })
    );
    highlightedMarker = marker;

    // Bring marker to front
    marker.setZIndexOffset(1000);
  }
}

// Center map on marker and ensure it's visible (not clustered)
function centerMapOnMarker(index) {
  const market = filteredMarkets[index];
  if (market && market.lat && market.lng) {
    // Start with a high zoom level to decluster
    const targetZoom = 16;

    map.setView([market.lat, market.lng], targetZoom, {
      animate: true,
      duration: 0.5,
    });

    // After animation, check if we need to zoom further to decluster
    setTimeout(() => {
      ensureMarkerVisible(index);
    }, 600);
  }
}

// Ensure a specific marker is visible (not clustered)
function ensureMarkerVisible(index) {
  const marker = marketMarkers.get(index);
  if (!marker || !markersCluster.hasLayer(marker)) {
    return;
  }

  // Check if marker is clustered
  const visibleParent = markersCluster.getVisibleParent(marker);
  if (visibleParent !== marker) {
    // Marker is still clustered, zoom in more
    const currentZoom = map.getZoom();
    const newZoom = Math.min(18, currentZoom + 1);

    if (newZoom > currentZoom) {
      map.setZoom(newZoom);
      // Check again after zoom
      setTimeout(() => {
        ensureMarkerVisible(index);
      }, 300);
    }
  }
}

// Group all markets by location for count badges
function groupMarketsByLocation() {
  const groups = [];
  const processed = new Set();
  const threshold = 0.0005; // Roughly 50 meters

  filteredMarkets.forEach((market, index) => {
    if (processed.has(index) || !market.lat || !market.lng) {
      return;
    }

    const group = { indices: [index], lat: market.lat, lng: market.lng };
    processed.add(index);

    // Find other markets at the same location
    filteredMarkets.forEach((otherMarket, otherIndex) => {
      if (
        otherIndex === index ||
        processed.has(otherIndex) ||
        !otherMarket.lat ||
        !otherMarket.lng
      ) {
        return;
      }

      const latDiff = Math.abs(otherMarket.lat - market.lat);
      const lngDiff = Math.abs(otherMarket.lng - market.lng);

      if (latDiff < threshold && lngDiff < threshold) {
        group.indices.push(otherIndex);
        processed.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
}

// Find markets at the same location (within ~50m)
function findMarketsAtSameLocation(targetIndex) {
  const targetMarket = filteredMarkets[targetIndex];
  if (!targetMarket || !targetMarket.lat || !targetMarket.lng) {
    return [targetIndex];
  }

  const sameLocationMarkets = [];
  const threshold = 0.0005; // Roughly 50 meters

  filteredMarkets.forEach((market, index) => {
    if (market.lat && market.lng) {
      const latDiff = Math.abs(market.lat - targetMarket.lat);
      const lngDiff = Math.abs(market.lng - targetMarket.lng);

      if (latDiff < threshold && lngDiff < threshold) {
        sameLocationMarkets.push(index);
      }
    }
  });

  return sameLocationMarkets;
}

// Find markets in the same city
function findMarketsInSameCity(targetIndex) {
  const targetMarket = filteredMarkets[targetIndex];
  if (!targetMarket || !targetMarket.city) {
    return [targetIndex];
  }

  const sameCityMarkets = [];
  const targetCity = targetMarket.city.toLowerCase().trim();

  filteredMarkets.forEach((market, index) => {
    if (market.city && market.city.toLowerCase().trim() === targetCity) {
      sameCityMarkets.push(index);
    }
  });

  return sameCityMarkets;
}

// Highlight location group (multiple markets at same location)
function highlightLocationGroup(targetIndex) {
  // Clear previous highlights
  clearAllHighlights();

  // Find all markets at the same location
  const sameLocationMarkets = findMarketsAtSameLocation(targetIndex);

  // Also find markets in the same city
  const sameCityMarkets = findMarketsInSameCity(targetIndex);

  // Combine both groups (remove duplicates)
  currentLocationGroup = [
    ...new Set([...sameLocationMarkets, ...sameCityMarkets]),
  ];

  // Filter sidebar to show markets at this location and city
  filterSidebarToLocationAndCity(
    currentLocationGroup,
    sameLocationMarkets,
    targetIndex
  );

  // Highlight the marker (just one marker for the location)
  highlightMarker(targetIndex);

  // Update sidebar header to show location info
  updateSidebarHeaderForLocationAndCity(
    targetIndex,
    sameLocationMarkets.length,
    currentLocationGroup.length
  );
}

// Add visual indicator for location grouping
function addLocationGroupIndicator() {
  if (currentLocationGroup.length <= 1) return;

  currentLocationGroup.forEach((index) => {
    const card = document.querySelector(`[data-market-index="${index}"]`);
    if (card) {
      card.classList.add("location-grouped");
    }
  });
}

// Filter sidebar to show markets at location and in same city
function filterSidebarToLocationAndCity(
  allCityMarkets,
  sameLocationMarkets,
  selectedIndex
) {
  const marketCardsContainer = document.getElementById("marketCards");
  const allCards = marketCardsContainer.querySelectorAll(".market-card");

  // Hide all cards first
  allCards.forEach((card) => {
    card.style.display = "none";
  });

  // Show cards for markets in the same city
  allCityMarkets.forEach((index) => {
    const card = document.querySelector(`[data-market-index="${index}"]`);
    if (card) {
      card.style.display = "block";

      // Only highlight the selected market card
      if (index === selectedIndex) {
        card.classList.add("highlighted");
      }

      // Check if this market is at the same location
      const isAtSameLocation = sameLocationMarkets.includes(index);

      if (isAtSameLocation) {
        card.classList.add("location-grouped");

        // Add "Zelfde locatie" tag if multiple markets at exact location
        if (sameLocationMarkets.length > 1) {
          addLocationTag(card, "📍 Zelfde locatie");
        }
      } else {
        // Add "Zelfde stad" tag for other markets in the city
        addLocationTag(card, "🏙️ Zelfde stad");
      }
    }
  });
}

// Helper function to add location tags
function addLocationTag(card, tagText) {
  const tagsContainer =
    card.querySelector(".market-tags") || document.createElement("div");
  if (!card.querySelector(".market-tags")) {
    tagsContainer.className = "market-tags";
    card.insertBefore(tagsContainer, card.querySelector(".market-card-title"));
  }

  // Remove existing location tags to avoid duplicates
  const existingLocationTags = tagsContainer.querySelectorAll(".location-tag");
  existingLocationTags.forEach((tag) => tag.remove());

  const locationTag = document.createElement("span");
  locationTag.className = "market-tag location-tag";
  locationTag.innerHTML = tagText;
  tagsContainer.appendChild(locationTag);
}

// Filter sidebar to show only markets at specific location (legacy function)
function filterSidebarToLocation(locationGroupIndices) {
  filterSidebarToLocationAndCity(
    locationGroupIndices,
    locationGroupIndices,
    locationGroupIndices[0]
  );
}

// Update sidebar header for location and city view
function updateSidebarHeaderForLocationAndCity(
  targetIndex,
  sameLocationCount,
  totalCityCount
) {
  const market = filteredMarkets[targetIndex];
  const sidebarTitle = document.getElementById("sidebarTitle");
  const locationStat = document.getElementById("locationStat");
  const locationCount = document.getElementById("locationCount");
  const locationLabel = document.getElementById("locationLabel");

  if (market) {
    sidebarTitle.textContent = `🏙️ ${market.city}`;

    // Show location stats in the stats bar
    locationStat.style.display = "flex";

    if (sameLocationCount > 1 && totalCityCount > sameLocationCount) {
      locationCount.textContent = `${sameLocationCount}+${
        totalCityCount - sameLocationCount
      }`;
      locationLabel.textContent = "Locatie + Stad";
    } else if (sameLocationCount > 1) {
      locationCount.textContent = sameLocationCount;
      locationLabel.textContent = "Op deze locatie";
    } else if (totalCityCount > 1) {
      locationCount.textContent = totalCityCount;
      locationLabel.textContent = `In ${market.city}`;
    } else {
      locationCount.textContent = "1";
      locationLabel.textContent = `In ${market.city}`;
    }

    // Add back button
    addBackToAllMarketsButton();
  }
}

// Update sidebar header for location view (legacy function)
function updateSidebarHeaderForLocation(targetIndex) {
  const sameLocationCount = currentLocationGroup.length;
  updateSidebarHeaderForLocationAndCity(
    targetIndex,
    sameLocationCount,
    sameLocationCount
  );
}

// Add back button to return to all markets
function addBackToAllMarketsButton() {
  const sidebarHeader = document.querySelector(".sidebar-header");

  // Remove existing back button if any
  const existingButton = sidebarHeader.querySelector(".back-button");
  if (existingButton) {
    existingButton.remove();
  }

  // Create back button
  const backButton = document.createElement("button");
  backButton.className = "back-button";
  backButton.innerHTML = "← Alle markten";
  backButton.onclick = () => {
    clearAllHighlights();
    displayMarketCards(); // Redisplay all cards
    resetSidebarHeader();
  };

  sidebarHeader.appendChild(backButton);
}

// Reset sidebar header to normal view
function resetSidebarHeader() {
  const sidebarTitle = document.getElementById("sidebarTitle");
  const locationStat = document.getElementById("locationStat");
  const backButton = document.querySelector(".back-button");

  sidebarTitle.textContent = "📍 Markten";

  // Hide location stats
  locationStat.style.display = "none";

  if (backButton) {
    backButton.remove();
  }
}

// Clear all highlights and groupings
function clearAllHighlights() {
  // Clear card highlights
  document.querySelectorAll(".market-card.highlighted").forEach((card) => {
    card.classList.remove("highlighted");
  });

  // Clear location grouping
  document.querySelectorAll(".market-card.location-grouped").forEach((card) => {
    card.classList.remove("location-grouped");
  });

  // Show all cards again
  document.querySelectorAll(".market-card").forEach((card) => {
    card.style.display = "block";
  });

  // Clear marker highlight
  if (highlightedMarker) {
    const prevIcon = highlightedMarker.getIcon();
    const prevHtml = prevIcon.options.html.replace(" highlighted", "");
    highlightedMarker.setIcon(
      L.divIcon({
        ...prevIcon.options,
        html: prevHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    );
    highlightedMarker = null;
  }

  // Clear current group
  currentLocationGroup = [];
}

// Get coordinates for Dutch postal code (simplified approximation)
function getCoordinatesFromPostalCode(postalCode) {
  // Remove spaces and get first 4 digits
  const cleanPostalCode = postalCode.replace(/\s+/g, "").substring(0, 4);

  // Dutch postal code coordinate approximations (first 2 digits determine region)
  const postalCodeRegions = {
    10: { lat: 52.3676, lng: 4.9041, city: "Amsterdam" }, // Amsterdam
    11: { lat: 52.3676, lng: 4.9041, city: "Amsterdam" },
    12: { lat: 52.0705, lng: 4.3007, city: "Den Haag" }, // Den Haag
    13: { lat: 52.0705, lng: 4.3007, city: "Den Haag" },
    20: { lat: 52.3874, lng: 4.6462, city: "Haarlem" }, // Haarlem region
    21: { lat: 52.3874, lng: 4.6462, city: "Haarlem" },
    30: { lat: 51.9244, lng: 4.4777, city: "Rotterdam" }, // Rotterdam
    31: { lat: 51.9244, lng: 4.4777, city: "Rotterdam" },
    32: { lat: 51.9244, lng: 4.4777, city: "Rotterdam" },
    33: { lat: 51.9244, lng: 4.4777, city: "Rotterdam" },
    34: { lat: 51.9244, lng: 4.4777, city: "Rotterdam" },
    35: { lat: 52.1561, lng: 5.3878, city: "Amersfoort" }, // Utrecht region
    36: { lat: 52.1561, lng: 5.3878, city: "Amersfoort" },
    37: { lat: 52.1561, lng: 5.3878, city: "Amersfoort" },
    38: { lat: 52.1561, lng: 5.3878, city: "Amersfoort" },
    39: { lat: 52.1561, lng: 5.3878, city: "Amersfoort" },
    40: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" }, // Eindhoven region
    41: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    42: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    43: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    44: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    45: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    46: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    47: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    48: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    49: { lat: 51.4416, lng: 5.4697, city: "Eindhoven" },
    50: { lat: 51.5555, lng: 5.0913, city: "Tilburg" }, // Tilburg region
    51: { lat: 51.5555, lng: 5.0913, city: "Tilburg" },
    52: { lat: 51.5555, lng: 5.0913, city: "Tilburg" },
    53: { lat: 51.5555, lng: 5.0913, city: "Tilburg" },
    60: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" }, // Nijmegen region
    61: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    62: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    63: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    64: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    65: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    66: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    67: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    68: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    69: { lat: 51.8426, lng: 5.8518, city: "Nijmegen" },
    70: { lat: 52.2215, lng: 6.8937, city: "Enschede" }, // Enschede region
    71: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    72: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    73: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    74: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    75: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    76: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    77: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    78: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    79: { lat: 52.2215, lng: 6.8937, city: "Enschede" },
    80: { lat: 53.2194, lng: 6.5665, city: "Groningen" }, // Groningen region
    81: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    82: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    83: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    84: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    85: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    86: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    87: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    88: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    89: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    90: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    91: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    92: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    93: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    94: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    95: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    96: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    97: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    98: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
    99: { lat: 53.2194, lng: 6.5665, city: "Groningen" },
  };

  const region = cleanPostalCode.substring(0, 2);
  return postalCodeRegions[region] || null;
}

// Calculate distance between two points using Haversine formula
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Get coordinates from location term (postal code or city name)
function getCoordinatesFromLocation(locationTerm) {
  // First try to parse as postal code
  const postalCodeMatch = locationTerm.match(/\d{4}/);
  if (postalCodeMatch) {
    const coords = getCoordinatesFromPostalCode(postalCodeMatch[0]);
    if (coords) return coords;
  }

  // Fallback to city name lookup
  const cityCoordinates = {
    amsterdam: { lat: 52.3676, lng: 4.9041 },
    rotterdam: { lat: 51.9244, lng: 4.4777 },
    "den haag": { lat: 52.0705, lng: 4.3007 },
    utrecht: { lat: 52.0907, lng: 5.1214 },
    eindhoven: { lat: 51.4416, lng: 5.4697 },
    tilburg: { lat: 51.5555, lng: 5.0913 },
    groningen: { lat: 53.2194, lng: 6.5665 },
    almere: { lat: 52.3508, lng: 5.2647 },
    breda: { lat: 51.5719, lng: 4.7683 },
    nijmegen: { lat: 51.8426, lng: 5.8518 },
    enschede: { lat: 52.2215, lng: 6.8937 },
    haarlem: { lat: 52.3874, lng: 4.6462 },
    arnhem: { lat: 51.9851, lng: 5.8987 },
    zaanstad: { lat: 52.4391, lng: 4.8275 },
    amersfoort: { lat: 52.1561, lng: 5.3878 },
  };

  return cityCoordinates[locationTerm.toLowerCase()] || null;
}

// Setup event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", debounce(applyFilters, 300));

  // Month filter
  const monthFilter = document.getElementById("monthFilter");
  monthFilter.addEventListener("change", applyFilters);

  // Location filter
  const locationFilter = document.getElementById("locationFilter");
  locationFilter.addEventListener("input", debounce(applyFilters, 300));

  // Distance filter
  const distanceFilter = document.getElementById("distanceFilter");
  distanceFilter.addEventListener("change", applyFilters);

  // Price filter
  const priceFilter = document.getElementById("priceFilter");
  priceFilter.addEventListener("change", applyFilters);

  // Reset button
  // const resetButton = document.getElementById("resetFilters");
  // resetButton.addEventListener("click", resetFilters);

  // Mobile filter toggle
  const mobileFilterToggle = document.getElementById("mobileFilterToggle");
  const controlsContent = document.getElementById("controlsContent");

  mobileFilterToggle.addEventListener("click", function () {
    const isExpanded = controlsContent.classList.contains("expanded");

    if (isExpanded) {
      controlsContent.classList.remove("expanded");
      mobileFilterToggle.classList.remove("expanded");
    } else {
      controlsContent.classList.add("expanded");
      mobileFilterToggle.classList.add("expanded");
    }
  });
}

// Apply filters
function applyFilters() {
  // Clear any selected card/location when filtering
  clearAllHighlights();
  resetSidebarHeader();

  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const selectedMonth = document.getElementById("monthFilter").value;
  const locationTerm = document
    .getElementById("locationFilter")
    .value.toLowerCase();
  const selectedDistance = document.getElementById("distanceFilter").value;
  const selectedPrice = document.getElementById("priceFilter").value;

  filteredMarkets = allMarkets.filter((market) => {
    // Search filter
    const matchesSearch = !searchTerm || market.searchText.includes(searchTerm);

    // Month filter
    const matchesMonth = !selectedMonth || market.monthName === selectedMonth;

    // Location filter - more flexible postal code matching
    const matchesLocation =
      !locationTerm ||
      market.city.toLowerCase().includes(locationTerm) ||
      market.postal_code
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(locationTerm.replace(/\s+/g, "")) ||
      market.venue.toLowerCase().includes(locationTerm);

    // Distance filter - coordinate-based calculation
    let matchesDistance = true;
    if (selectedDistance && locationTerm && market.lat && market.lng) {
      const maxDistance = parseInt(selectedDistance);
      const searchCoords = getCoordinatesFromLocation(locationTerm);

      if (searchCoords) {
        const distance = calculateHaversineDistance(
          searchCoords.lat,
          searchCoords.lng,
          market.lat,
          market.lng
        );
        matchesDistance = distance <= maxDistance;
      }
    }

    // Price filter
    let matchesPrice = true;
    if (selectedPrice === "gratis") {
      matchesPrice = !market.isPaid;
    } else if (selectedPrice === "betaald") {
      matchesPrice = market.isPaid;
    }

    return (
      matchesSearch &&
      matchesMonth &&
      matchesLocation &&
      matchesDistance &&
      matchesPrice
    );
  });

  updateStats();
  displayMarkers();
  displayMarketCards();
}

// Reset all filters
function resetFilters() {
  // Clear any selected card/location when resetting
  clearAllHighlights();
  resetSidebarHeader();

  document.getElementById("searchInput").value = "";
  document.getElementById("monthFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("distanceFilter").value = "";
  document.getElementById("priceFilter").value = "";

  filteredMarkets = [...allMarkets];
  updateStats();
  displayMarkers();
  displayMarketCards();
}

// Update statistics
function updateStats() {
  document.getElementById("totalMarkets").textContent = allMarkets.length;

  // Show filter information if filters are active
  const filterStat = document.getElementById("filterStat");
  const filterCount = document.getElementById("filterCount");
  const filterLabel = document.getElementById("filterLabel");

  const hasFilters = hasActiveFilters();

  if (hasFilters) {
    filterStat.style.display = "flex";
    filterCount.textContent = filteredMarkets.length;
    filterLabel.textContent = "Getoond";
  } else {
    filterStat.style.display = "none";
  }
}

// Check if any filters are currently active
function hasActiveFilters() {
  const searchTerm = document.getElementById("searchInput").value.trim();
  const selectedMonth = document.getElementById("monthFilter").value;
  const locationTerm = document.getElementById("locationFilter").value.trim();
  const selectedDistance = document.getElementById("distanceFilter").value;
  const selectedPrice = document.getElementById("priceFilter").value;

  return (
    searchTerm ||
    selectedMonth ||
    locationTerm ||
    selectedDistance ||
    selectedPrice
  );
}

// Find next upcoming market
function findNextMarket(today) {
  const upcomingMarkets = allMarkets
    .map((market) => ({
      ...market,
      parsedDate: parseMarketDate(market.date),
    }))
    .filter((market) => market.parsedDate && market.parsedDate >= today)
    .sort((a, b) => a.parsedDate - b.parsedDate);

  if (upcomingMarkets.length > 0) {
    const next = upcomingMarkets[0];
    return formatDate(next.parsedDate);
  }

  return null;
}

// Parse market date (enhanced implementation)
function parseMarketDate(dateString) {
  if (!dateString) return null;

  const monthMap = {
    augustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    december: 11,
    januari: 0,
    februari: 1,
  };

  const dayMatch = dateString.match(/(\d{1,2})/);
  const monthMatch = dateString
    .toLowerCase()
    .match(/(augustus|september|oktober|november|december|januari|februari)/);

  if (dayMatch && monthMatch) {
    const day = parseInt(dayMatch[1]);
    const month = monthMap[monthMatch[1]];
    // Handle 2026 dates for januari and februari
    const year =
      monthMatch[1] === "januari" || monthMatch[1] === "februari" ? 2026 : 2025;
    return new Date(year, month, day);
  }

  return null;
}

// Check if a market date is this week
function isMarketThisWeek(marketDate) {
  if (!marketDate) return false;

  const today = new Date();
  const startOfWeek = new Date(today);
  const endOfWeek = new Date(today);

  // Get start of this week (Monday)
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
  startOfWeek.setDate(today.getDate() + daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Get end of this week (Sunday)
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return marketDate >= startOfWeek && marketDate <= endOfWeek;
}

// Sort markets by date (upcoming first)
function sortMarketsByDate(markets) {
  const today = new Date();

  return markets.sort((a, b) => {
    const dateA = parseMarketDate(a.date);
    const dateB = parseMarketDate(b.date);

    // If both have dates
    if (dateA && dateB) {
      // Prioritize upcoming dates
      const isAUpcoming = dateA >= today;
      const isBUpcoming = dateB >= today;

      if (isAUpcoming && !isBUpcoming) return -1;
      if (!isAUpcoming && isBUpcoming) return 1;

      // Both upcoming or both past - sort by date
      return dateA - dateB;
    }

    // If only one has a date, prioritize it
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    // If neither has a date, sort alphabetically by title
    return a.title.localeCompare(b.title);
  });
}

// Format date for display
function formatDate(date) {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function hideLoading() {
  const loading = document.getElementById("loading");
  loading.classList.add("hidden");
}

function showError(message) {
  console.error(message);
  // You could add a proper error display here
}
