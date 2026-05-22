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
  initMap();
  renderDayNav();
  selectDay(0);
  setupModal();
}

// Curated high-quality Wikimedia fallbacks for each stop
const fallbackImages = {
  'Mangaluru': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Mangalore_Skyline.jpg',
  'Gonikoppa': 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Coffee_beans_on_a_bush_in_Coorg.jpg',
  'Tholpetty Wildlife Sanctuary': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Tholpetty_Wildlife_Sanctuary%2C_Wayanad.jpg',
  'Kabini Backwaters': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Kabini_River_near_Kabini_Jungle_Lodges.jpg',
  'Nettara Village': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Paddy_field_Wayanad.jpg',
  'Thirunelli Temple': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Thirunelli_temple.JPG',
  'Thirunelli Temple (Start)': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Thirunelli_temple.JPG',
  'Kuruva Dweep': 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Kuruva_islands_wayanad.jpg',
  'Chekadi Forest Village': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Paddy_field_Wayanad.jpg',
  'Pulpally Interlock Road': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Rubber_plantation_in_Wayanad.jpg',
  'Pulpally (Start)': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Rubber_plantation_in_Wayanad.jpg',
  'Vadakkanad': 'https://upload.wikimedia.org/wikipedia/commons/1/14/Elephant_near_Wayanad_Wildlife_Sanctuary.jpg',
  'Muthanga Wildlife Sanctuary': 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Muthanga_Wildlife_Sanctuary.JPG',
  'Edakkal Caves': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Edakkal_Caves_1.JPG',
  'Banasura Sagar Dam': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Scenic_Banasura_Sagar_Dam.jpg',
  'Banasura Sagar Dam (Start)': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Scenic_Banasura_Sagar_Dam.jpg',
  'En Ooru Tribal Village': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Huts_in_En_Ooru%2C_Pookode%2C_Wayanad.jpg',
  'Palchuram View Point': 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Palchuram.jpg',
  'Kannur': 'https://upload.wikimedia.org/wikipedia/commons/5/52/Payyambalam_Beach_Kannur.jpg',
  'Mangaluru (Arrival)': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Mangalore_Skyline.jpg',
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
function renderDaySummary(day) {
  document.getElementById('day-summary-card').innerHTML = `
    <div class="summary-card" style="--card-accent:${day.color}">
      <div class="summary-title">${day.emoji} Day ${day.day}: ${day.title}</div>
      <div class="summary-date">${day.date} · ${day.overnight.includes('Home') ? 'Return Day' : 'Overnight: ' + day.overnight}</div>
      <div class="summary-route">📍 ${day.route}</div>
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

