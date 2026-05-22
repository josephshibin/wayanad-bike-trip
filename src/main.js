import './style.css';
import { tripMeta, days } from './data.js';

// ── State ──────────────────────────────────────────────────────
let currentDay = 0;
let map = null;
let markersLayer = null;
let routeLine = null;
const imageCache = {};

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

function init() {
  renderDayNav();
  initMap();
  selectDay(0);
  setupModal();

  // Mobile Map Expand/Collapse & Drag Handle
  const mapWrapper = document.getElementById('map-wrapper');
  const dragHandle = document.getElementById('drag-handle');
  if (mapWrapper) {
    mapWrapper.addEventListener('click', () => {
      if (window.innerWidth <= 900 && mapWrapper.classList.contains('map-collapsed')) {
        mapWrapper.classList.remove('map-collapsed');
        setTimeout(() => { if (map) map.invalidateSize(); }, 350);
      }
    });
  }

  if (dragHandle && mapWrapper) {
    let startY = 0;
    dragHandle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    });
    dragHandle.addEventListener('touchmove', (e) => { 
      e.preventDefault(); 
    }, { passive: false });
    dragHandle.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - startY;
      if (window.innerWidth <= 900) {
        if (deltaY < -20) {
          mapWrapper.classList.add('map-collapsed'); // swiped up
        } else if (deltaY > 20) {
          mapWrapper.classList.remove('map-collapsed'); // swiped down
        } else {
          mapWrapper.classList.toggle('map-collapsed'); // tapped
        }
        setTimeout(() => { if (map) map.invalidateSize(); }, 350);
      }
    });
  }
}

// Curated high-quality fallback images from official tourism boards
const fallbackImages = {
  'Mangaluru': 'https://s7ap1.scene7.com/is/image/incredibleindia/kudroli-gokarnath-temple-mangalore-karnataka-tri-hero?qlt=82&ts=1727164706134',
  'Gonikoppa': 'https://s7ap1.scene7.com/is/image/incredibleindia/coorg-karnataka-city-hero?qlt=82',
  'Tholpetty Wildlife Sanctuary': 'https://www.keralatourism.org/images/destination/large/tholpetty_wildlife_sanctuary_wayanad20131031115206_309_1.jpg',
  'Kabini Backwaters': 'https://s7ap1.scene7.com/is/image/incredibleindia/kabini-river-kabini-karnataka-tri-hero?qlt=82',
  'Nettara Village': 'https://www.keralatourism.org/images/destination/large/chembra_peak_wayanad20131031103233_130_1.jpg',
  'Thirunelli Temple': 'https://www.keralatourism.org/images/destination/large/thirunelli_temple_wayanad20131031114524_178_1.jpg',
  'Thirunelli Temple (Start)': 'https://www.keralatourism.org/images/destination/large/thirunelli_temple_wayanad20131031114524_178_1.jpg',
  'Kuruva Dweep': 'https://www.keralatourism.org/images/destination/large/kuruva_island_wayanad20131031105151_225_1.jpg',
  'Chekadi Forest Village': 'https://www.keralatourism.org/images/destination/large/wayanad20131031115456_270_1.jpg',
  'Pulpally Interlock Road': 'https://www.keralatourism.org/images/destination/large/pookot_lake_wayanad20131031111818_283_1.jpg',
  'Pulpally (Start)': 'https://www.keralatourism.org/images/destination/large/pookot_lake_wayanad20131031111818_283_1.jpg',
  'Vadakkanad': 'https://www.keralatourism.org/images/destination/large/pakshipathalam_wayanad20131031111327_262_1.jpg',
  'Muthanga Wildlife Sanctuary': 'https://www.keralatourism.org/images/destination/large/wayanad_wildlife_sanctuary_muthanga20131105170321_308_1.jpg',
  'Edakkal Caves': 'https://www.keralatourism.org/images/destination/large/edakkal_caves_wayanad20131031103606_131_1.jpg',
  'Banasura Sagar Dam': 'https://www.keralatourism.org/images/destination/large/banasura_sagar_dam_wayanad20131031102901_330_1.jpg',
  'Banasura Sagar Dam (Start)': 'https://www.keralatourism.org/images/destination/large/banasura_sagar_dam_wayanad20131031102901_330_1.jpg',
  'En Ooru Tribal Village': 'https://www.keralatourism.org/images/destination/large/vythiri_wayanad20131031115340_303_1.jpg',
  'Palchuram View Point': 'https://www.keralatourism.org/images/destination/large/kanthappara_waterfall_wayanad20131031104845_161_1.jpg',
  'Kannur': 'https://www.keralatourism.org/images/destination/large/payyambalam_beach_kannur20131031111652_160_1.jpg',
  'Mangaluru (Arrival)': 'https://s7ap1.scene7.com/is/image/incredibleindia/kudroli-gokarnath-temple-mangalore-karnataka-tri-hero?qlt=82&ts=1727164706134',
};

// ── Map ────────────────────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: [11.8, 76.05],
    zoom: 10,
    zoomControl: false,
    attributionControl: false,
  });

  // Light Voyager tile layer matching the new light theme
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd',
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: false })
    .addAttribution('© <a href="https://www.openstreetmap.org/">OSM</a> · <a href="https://carto.com/">CARTO</a>')
    .addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

// ── Day Navigation ─────────────────────────────────────────────
function renderDayNav() {
  const nav = document.getElementById('day-nav');
  nav.innerHTML = days.map((d, i) => `
    <button class="day-tab${i === 0 ? ' active' : ''}"
            id="day-tab-${i}"
            style="--active-color:${d.color};--active-bg:${d.colorLight}"
            data-day="${i}">
      <span class="tab-emoji">${d.emoji}</span>
      Day ${d.day}: ${d.title}
      <span class="tab-dist">${d.distance}</span>
    </button>
  `).join('');

  nav.addEventListener('click', (e) => {
    const tab = e.target.closest('.day-tab');
    if (!tab) return;
    selectDay(Number(tab.dataset.day));
  });
}

function selectDay(dayIndex) {
  currentDay = dayIndex;
  const day = days[dayIndex];

  // Update tab states
  document.querySelectorAll('.day-tab').forEach((t, i) => {
    t.classList.toggle('active', i === dayIndex);
  });

  renderDaySummary(day);
  renderStops(day);
  updateMap(day);
  renderLegend(day);
}

// ── Day Summary Card ───────────────────────────────────────────
function getGoogleMapsRouteUrl(day) {
  if (!day.stops || day.stops.length < 2) return '#';
  const origin = `${day.stops[0].lat},${day.stops[0].lng}`;
  const destination = `${day.stops[day.stops.length - 1].lat},${day.stops[day.stops.length - 1].lng}`;
  const wps = day.stops.slice(1, -1).map(s => `${s.lat},${s.lng}`);
  const waypoints = wps.length > 0 ? `&waypoints=${wps.join('|')}` : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`;
}

function renderDaySummary(day) {
  document.getElementById('day-summary-card').innerHTML = `
    <div class="summary-card" style="--card-accent:${day.color}">
      <div class="summary-title">${day.emoji} Day ${day.day}: ${day.title}</div>
      <div class="summary-date">${day.date} · ${day.overnight.includes('Home') ? 'Return Day' : 'Overnight: ' + day.overnight}</div>
      <div class="summary-route">
        📍 ${day.route}
        <div style="margin-top: 14px;">
          <a href="${getGoogleMapsRouteUrl(day)}" target="_blank" rel="noopener" class="gmaps-route-btn" style="background:${day.color};">
            🗺️ View Route in Google Maps
          </a>
        </div>
      </div>
      <div class="summary-stats">
        <div class="stat-box">
          <div class="stat-value" style="color:${day.color}">${day.distance}</div>
          <div class="stat-label">Distance</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:${day.color}">${day.ridingTime}</div>
          <div class="stat-label">Riding</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:${day.color}">${day.stops.length}</div>
          <div class="stat-label">Stops</div>
        </div>
      </div>
      <div class="summary-overnight">🛏️ <span>${day.overnight}</span></div>
    </div>
  `;
}

// ── Stops List ─────────────────────────────────────────────────
function renderStops(day) {
  const container = document.getElementById('stops-list');
  container.innerHTML = `
    <div class="stops-heading">Stops & Timeline</div>
    ${day.stops.map((stop, i) => `
      <div class="stop-card animate-in"
           data-stop-index="${i}"
           style="--dot-color:${day.color};--highlight-bg:${day.colorLight};--highlight-color:${day.color};--active-color:${day.color}">
        <div class="stop-timeline">
          <div class="stop-dot"></div>
          <div class="stop-line"></div>
        </div>
        <div class="stop-info">
          <div class="stop-name">
            ${stop.name}
            <span class="stop-highlight">${stop.highlight}</span>
          </div>
          <div class="stop-time">🕐 ${stop.time}</div>
          <div class="stop-desc">${stop.description}</div>
        </div>
      </div>
    `).join('')}
  `;

  container.querySelectorAll('.stop-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.stopIndex);
      const stop = day.stops[idx];
      // Fly to marker
      map.flyTo([stop.lat, stop.lng], 13, { duration: 1 });
      // Highlight
      container.querySelectorAll('.stop-card').forEach(c => c.classList.remove('active-stop'));
      card.classList.add('active-stop');
      // Open modal
      openModal(stop, day.color, day.colorLight);
    });
  });
}

// ── Map Update ─────────────────────────────────────────────────
function updateMap(day) {
  // Ensure the map container size is recalculated (critical for mobile view changes)
  setTimeout(() => { if (map) map.invalidateSize(); }, 50);

  markersLayer.clearLayers();
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

  const coords = day.stops.map(s => [s.lat, s.lng]);

  // Draw route polyline
  routeLine = L.polyline(coords, {
    color: day.color,
    weight: 3,
    opacity: 0.7,
    dashArray: '8 6',
    lineCap: 'round',
  }).addTo(map);

  // Add markers
  day.stops.forEach((stop, i) => {
    const isFirst = i === 0;
    const isLast = i === day.stops.length - 1;
    const label = isFirst ? '▶' : isLast ? '■' : (i + 1).toString();
    const extraClass = isFirst ? ' start-marker' : isLast ? ' end-marker' : '';

    const icon = L.divIcon({
      className: '',
      html: `<div class="custom-marker${extraClass}" style="background:${day.color}">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(markersLayer);
    marker.on('click', () => {
      openModal(stop, day.color, day.colorLight);
      // Highlight sidebar
      const cards = document.querySelectorAll('.stop-card');
      cards.forEach(c => c.classList.remove('active-stop'));
      if (cards[i]) cards[i].classList.add('active-stop');
    });

    // Tooltip
    marker.bindTooltip(stop.name, {
      direction: 'top',
      offset: [0, -18],
      className: 'marker-tooltip',
    });
  });

  // Fit bounds
  const bounds = L.latLngBounds(coords);
  map.fitBounds(bounds.pad(0.15), { duration: 1 });
}

// ── Map Legend ──────────────────────────────────────────────────
function renderLegend(day) {
  document.getElementById('map-legend').innerHTML = `
    <div class="legend-title">Route Legend</div>
    <div class="legend-item">
      <div class="legend-line" style="background:${day.color}"></div>
      <span>Day ${day.day} Route</span>
    </div>
    <div class="legend-item">
      <div class="custom-marker" style="background:${day.color};width:18px;height:18px;font-size:9px;border-width:2px">▶</div>
      <span>Start</span>
    </div>
    <div class="legend-item">
      <div class="custom-marker" style="background:${day.color};width:18px;height:18px;font-size:9px;border-width:2px">■</div>
      <span>End / Overnight</span>
    </div>
  `;
}



// ── Modal ──────────────────────────────────────────────────────
function setupModal() {
  const overlay = document.getElementById('place-modal');
  document.getElementById('modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

async function openModal(stop, color, colorLight) {
  const overlay = document.getElementById('place-modal');
  const img = document.getElementById('modal-image');
  const body = document.getElementById('modal-body');

  // Reset image
  img.classList.remove('loaded');
  img.src = '';

  // Google Maps search query URL
  const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name + ', ' + (stop.name.includes('Mangaluru') || stop.name.includes('Gonikoppa') ? 'Karnataka' : 'Kerala, India'))}`;

  // Body content
  body.innerHTML = `
    <div class="modal-place-name">${stop.name}</div>
    <div class="modal-place-time">🕐 ${stop.time}</div>
    <span class="modal-place-highlight" style="background:${colorLight};color:${color}">${stop.highlight}</span>
    <p class="modal-place-desc">${stop.description}</p>
    <a class="modal-wiki-link" href="${gMapsUrl}" target="_blank" rel="noopener">
      🗺️ View on Google Maps →
    </a>
  `;

  // Show modal
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Use the curated image
  const imageUrl = fallbackImages[stop.name];

  if (imageUrl) {
    // Clear previous handlers
    img.onload = null;
    img.onerror = null;
    
    img.onload = () => img.classList.add('loaded');
    img.onerror = () => {
      console.warn("Failed to load image:", imageUrl);
      img.classList.add('loaded');
    };
    img.alt = stop.name;
    img.src = imageUrl;
  }
}

function closeModal() {
  const overlay = document.getElementById('place-modal');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

