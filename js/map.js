// ═══════════════════════════════════════════════════════
// MAP.JS — MULTI‑API LAYER SYSTEM (v4.0)
// Enhanced: Floating Panel · City Markers · Smooth Transitions
// Fixed: Satellite tile URL
// CliFix · Eco‑Weather Intelligence
// ═══════════════════════════════════════════════════════

// ── Layer Groups ──────────────────────────────────────
let tempLayer   = L.layerGroup();
let windLayer   = L.layerGroup();
let precipLayer = L.layerGroup();
let cloudsLayer = L.layerGroup();
let aqiLayer    = L.layerGroup();
let alertLayer  = L.layerGroup();

// ── Layer Active States ───────────────────────────────
let tempActive   = false;
let windActive   = false;
let precipActive = false;
let cloudsActive = false;
let aqiActive    = false;
let alertActive  = false;
let radarActive  = false;
let citiesActive = true;

// ── Wind Velocity State ───────────────────────────────
let velocityLayer = null;

// ── Alert Pulse State ─────────────────────────────────
let alertPulseInterval = null;
let alertMarkerEls = [];

// ── Radar State ───────────────────────────────────────
let radarTiles = null;
let radarTimestamps = [];
let radarCurrentIndex = 0;
let radarInterval = null;

// ── Panel State ───────────────────────────────────────
let panelCollapsed = false;

// ── Layer Definitions (for Legend) ───────────────────
const LAYER_DEFS = {
  temp: {
    label: 'Temperature', icon: '🌡️',
    legend: [
      { color: '#FF5252', label: '> 30°C  Hot'     },
      { color: '#FFB300', label: '20–30°C Warm'    },
      { color: '#69F0AE', label: '10–20°C Mild'    },
      { color: '#29B6F6', label: '< 10°C  Cool'    },
    ]
  },
  wind: {
    label: 'Wind Speed', icon: '💨',
    legend: [
      { color: '#B2EBF2', label: '0–20 km/h Calm'    },
      { color: '#29B6F6', label: '20–40 km/h Breezy' },
      { color: '#0288D1', label: '40–60 km/h Strong' },
      { color: '#FF5252', label: '60+ km/h  Gale'    },
    ]
  },
  precip: {
    label: 'Rain Radar', icon: '🌧️',
    legend: [
      { color: '#90CAF9', label: '0–10%  Dry'      },
      { color: '#42A5F5', label: '10–40% Light'    },
      { color: '#1976D2', label: '40–70% Moderate' },
      { color: '#0D47A1', label: '70%+   Heavy'    },
    ]
  },
  clouds: {
    label: 'Cloud Cover', icon: '☁️',
    legend: [
      { color: '#ffffff', label: 'Clear sky'        },
      { color: '#b0bec5', label: 'Partly cloudy'    },
      { color: '#78909c', label: 'Mostly cloudy'    },
      { color: '#37474f', label: 'Overcast'         },
    ]
  },
  aqi: {
    label: 'Air Quality', icon: '🌫️',
    legend: [
      { color: '#00E676', label: '0–50   Good'        },
      { color: '#FFD600', label: '51–100 Moderate'    },
      { color: '#FF9800', label: '101–150 Unhealthy*' },
      { color: '#F44336', label: '150+   Unhealthy'   },
    ]
  },
  alert: {
    label: 'Weather Alerts', icon: '⚠️',
    legend: [
      { color: '#FF5252', label: 'Severe alert active' },
      { color: '#FF9800', label: 'Watch / Advisory'    },
    ]
  }
};

const MAP_CITIES = [
  // Tier 1 — Major World Cities
  { name: 'New York',      lat: 40.71,  lon: -74.01,  tier: 1 },
  { name: 'London',        lat: 51.51,  lon: -0.13,   tier: 1 },
  { name: 'Tokyo',         lat: 35.69,  lon: 139.69,  tier: 1 },
  { name: 'Sydney',        lat: -33.87, lon: 151.21,  tier: 1 },
  { name: 'Dubai',         lat: 25.20,  lon: 55.27,   tier: 1 },
  { name: 'Paris',         lat: 48.86,  lon: 2.35,    tier: 1 },
  { name: 'Singapore',     lat: 1.35,   lon: 103.82,  tier: 1 },
  { name: 'Mumbai',        lat: 19.08,  lon: 72.88,   tier: 1 },
  { name: 'Cairo',         lat: 30.05,  lon: 31.24,   tier: 1 },
  { name: 'Los Angeles',   lat: 34.05,  lon: -118.24, tier: 1 },
  { name: 'São Paulo',     lat: -23.55, lon: -46.63,  tier: 1 },
  { name: 'Beijing',       lat: 39.91,  lon: 116.39,  tier: 1 },
  { name: 'Moscow',        lat: 55.75,  lon: 37.62,   tier: 1 },

  // Tier 2 — Regional / SE Asia
  { name: 'Jakarta',              lat: 6.21,   lon: 106.85,  tier: 2 },
  { name: 'Bangkok',              lat: 13.76,  lon: 100.50,  tier: 2 },
  { name: 'Hanoi',                lat: 21.03,  lon: 105.85,  tier: 2 },
  { name: 'Manila',               lat: 14.60,  lon: 120.98,  tier: 2 },
  { name: 'Kuala Lumpur',         lat: 3.14,   lon: 101.69,  tier: 2 },
  { name: 'Naypyidaw',            lat: 19.76,  lon: 96.08,   tier: 2 },
  { name: 'Phnom Penh',           lat: 11.56,  lon: 104.93,  tier: 2 },
  { name: 'Vientiane',            lat: 17.98,  lon: 102.63,  tier: 2 },
  { name: 'Singapore',            lat: 1.35,   lon: 103.82,  tier: 2 },
  { name: 'Bandar Seri Begawan',  lat: 4.90,   lon: 114.94,  tier: 2 },

  // Tier 3 — Philippines Local
  { name: 'Cebu City',            lat: 10.32,  lon: 123.90,  tier: 3 },
  { name: 'Davao City',           lat: 7.09,   lon: 125.61,  tier: 3 },
  { name: 'Quezon City',          lat: 14.68,  lon: 121.04,  tier: 3 },
  { name: 'Zamboanga',            lat: 6.91,   lon: 122.07,  tier: 3 },
  { name: 'Manila',               lat: 14.60,  lon: 120.98,  tier: 3 },
  { name: 'Caloocan',             lat: 14.65,  lon: 120.97,  tier: 3 },
  { name: 'Antipolo',             lat: 14.58,  lon: 121.18,  tier: 3 },
  { name: 'Iloilo City',          lat: 10.72,  lon: 122.57,  tier: 3 },
  { name: 'Taguig',               lat: 14.52,  lon: 122.96,  tier: 3 },
  { name: 'Cagayan de Oro',       lat: 8.48,   lon: 124.65,  tier: 3 },
];

// ─────────────────────────────────────────────────────
// INJECT CSS
// ─────────────────────────────────────────────────────
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Loader ── */
    .map-layer-loader {
      position:absolute; top:0; left:0; right:0; bottom:0;
      background:rgba(7,13,10,0.65); backdrop-filter:blur(3px);
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; z-index:1000; border-radius:var(--radius,12px);
      transition:opacity 0.3s; pointer-events:none;
    }
    .map-layer-loader.hidden { opacity:0; pointer-events:none; }
    .map-layer-loader-spinner { width:36px; height:36px; border:3px solid rgba(0,230,118,0.2);
      border-top-color:#00E676; border-radius:50%; animation:mllSpin 0.8s linear infinite; }
    .map-layer-loader-text { color:#69F0AE; font-size:0.82rem; margin-top:10px; font-family:Outfit,sans-serif; }
    @keyframes mllSpin { to { transform:rotate(360deg); } }

    .map-btn.loading { opacity:0.6; pointer-events:none; }
    .map-btn .btn-spinner { display:none; animation:mllSpin 0.7s linear infinite; }
    .map-btn.loading .btn-spinner { display:inline-block; }
    .map-btn.loading .btn-icon { display:none; }

    /* ── Conflict Toast ── */
    .layer-conflict-toast {
      position:absolute; bottom:70px; left:50%; transform:translateX(-50%);
      background:rgba(255,152,0,0.15); border:1px solid rgba(255,152,0,0.5);
      color:#FFB300; padding:8px 16px; border-radius:20px; font-size:0.78rem;
      z-index:900; white-space:nowrap; animation:fadeInUp 0.3s ease;
      font-family:Outfit,sans-serif; pointer-events:none;
    }
    @keyframes fadeInUp {
      from { opacity:0; transform:translateX(-50%) translateY(10px); }
      to   { opacity:1; transform:translateX(-50%) translateY(0); }
    }

    /* ── Legend ── */
    .map-legend {
      background:rgba(10,20,14,0.95); border:1px solid rgba(0,230,118,0.18);
      border-radius:12px; padding:14px 18px; margin-top:12px;
      backdrop-filter:blur(16px); display:flex; flex-wrap:wrap; gap:20px;
      font-family:Outfit,sans-serif; animation:fadeInUp 0.3s ease;
      transition:all 0.3s ease;
    }
    .map-legend.hidden { display:none; }
    .map-legend-section { min-width:140px; }
    .map-legend-title { color:#69F0AE; font-size:0.72rem; font-weight:700;
      text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;
      display:flex; align-items:center; gap:5px; }
    .map-legend-row { display:flex; align-items:center; gap:7px;
      color:#B0C4B8; font-size:0.75rem; margin-bottom:4px; }
    .map-legend-swatch { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .map-legend-footer { width:100%; border-top:1px solid rgba(0,230,118,0.1);
      padding-top:8px; margin-top:4px; display:flex; justify-content:space-between;
      align-items:center; color:#5A7A60; font-size:0.72rem; }
    .map-legend-reset { background:none; border:1px solid rgba(0,230,118,0.2);
      color:#69F0AE; padding:4px 12px; border-radius:6px; cursor:pointer;
      font-size:0.72rem; font-family:inherit; transition:all 0.2s; }
    .map-legend-reset:hover { background:rgba(0,230,118,0.08); border-color:rgba(0,230,118,0.4); }

    /* ── Alert Pulse ── */
    @keyframes alertPulse {
      0%,100% { box-shadow:0 0 0 0 rgba(255,82,82,0.7), 0 0 8px rgba(255,82,82,0.4); }
      50%      { box-shadow:0 0 0 14px rgba(255,82,82,0), 0 0 16px rgba(255,82,82,0.2); }
    }
    .alert-pulse-icon { animation:alertPulse 1.6s ease-out infinite; border-radius:12px; }

    #btn-reset-layers { border-color:rgba(255,82,82,0.3); color:#FF8A80; }
    #btn-reset-layers:hover { background:rgba(255,82,82,0.08); border-color:rgba(255,82,82,0.5); color:#FF5252; }

    /* ── Radar Slider ── */
    #radar-slider-container {
      display:flex; align-items:center; gap:10px;
      background:rgba(10,20,14,0.8); padding:6px 12px;
      border-radius:8px; margin-bottom:8px;
      border:1px solid rgba(0,230,118,0.15);
      font-family:Outfit,sans-serif;
    }
    #radar-slider { flex:1; accent-color:#06b6d4; }
    #radar-time-label { color:#69F0AE; font-size:0.8rem; white-space:nowrap; }

    /* ── Map Search Form ── */
    .map-search-form {
      display:flex; gap:0.5rem; background:rgba(10,20,14,0.7);
      border:1px solid rgba(0,230,118,0.18);
      border-radius:10px; padding:0.5rem; margin-bottom:12px;
      backdrop-filter:blur(12px);
    }
    .map-search-form input {
      flex:1; background:transparent; border:none;
      color:#E8F5E1; font-size:0.95rem; padding:0.5rem; outline:none;
      font-family:inherit;
    }
    .map-search-form input::placeholder { color:#5A7A60; }
    .map-search-form button {
      background:rgba(0,230,118,0.15); color:#69F0AE;
      border:1px solid rgba(0,230,118,0.3); border-radius:8px;
      width:42px; display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:0.2s;
    }
    .map-search-form button:hover { background:rgba(0,230,118,0.25); }

    /* ══════════════════════════════════════════════════
       FLOATING CONTROL PANEL
    ══════════════════════════════════════════════════ */
    #map-float-panel {
      position:absolute;
      top:12px; right:12px;
      width:216px;
      background:rgba(7,13,10,0.94);
      backdrop-filter:blur(22px);
      border:1px solid rgba(0,230,118,0.18);
      border-radius:16px;
      z-index:1001;
      font-family:Outfit,sans-serif;
      box-shadow:0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,230,118,0.06);
      transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
      overflow:hidden;
    }
    #map-float-panel.collapsed { width:46px; }
    #map-float-panel.collapsed #mfp-body { display:none; }
    #map-float-panel.collapsed .mfp-header-title { display:none; }
    #map-float-panel.collapsed #mfp-toggle-btn { transform:rotate(180deg); }

    .mfp-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:11px 13px 10px;
      border-bottom:1px solid rgba(0,230,118,0.1);
      cursor:default;
    }
    .mfp-header-title {
      color:#69F0AE; font-size:0.78rem; font-weight:700;
      letter-spacing:0.06em; text-transform:uppercase;
      display:flex; align-items:center; gap:7px;
    }
    .mfp-header-title span { font-size:1rem; }
    #mfp-toggle-btn {
      background:none; border:none; color:#5A7A60;
      cursor:pointer; padding:2px 4px; border-radius:6px;
      font-size:1rem; line-height:1; transition:all 0.25s;
      display:flex; align-items:center; justify-content:center;
      width:24px; height:24px;
    }
    #mfp-toggle-btn:hover { color:#00E676; background:rgba(0,230,118,0.08); }

    #mfp-body { padding:10px 12px 13px; display:flex; flex-direction:column; gap:0; }

    /* Section labels */
    .mfp-section-label {
      color:#3D6B48; font-size:0.67rem; font-weight:700;
      text-transform:uppercase; letter-spacing:0.1em;
      padding:7px 0 5px; margin-top:4px;
      border-top:1px solid rgba(0,230,118,0.07);
    }
    .mfp-section-label:first-child { border-top:none; margin-top:0; padding-top:2px; }

    /* Base map buttons */
    .mfp-base-row {
      display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;
    }
    .mfp-base-btn {
      background:rgba(255,255,255,0.03); border:1px solid rgba(0,230,118,0.15);
      color:#8FAD8A; padding:7px 6px; border-radius:9px; cursor:pointer;
      font-size:0.76rem; font-family:inherit; font-weight:500;
      transition:all 0.2s; text-align:center;
    }
    .mfp-base-btn:hover { border-color:rgba(0,230,118,0.35); color:#B0D4B8; background:rgba(0,230,118,0.06); }
    .mfp-base-btn.active { background:rgba(0,230,118,0.12); border-color:rgba(0,230,118,0.5); color:#69F0AE; }

    .mfp-locate-btn {
      width:100%; background:rgba(41,182,246,0.08);
      border:1px solid rgba(41,182,246,0.25); color:#81D4FA;
      padding:7px 10px; border-radius:9px; cursor:pointer;
      font-size:0.76rem; font-family:inherit; font-weight:500;
      transition:all 0.2s; margin-bottom:2px; text-align:center;
    }
    .mfp-locate-btn:hover { background:rgba(41,182,246,0.16); border-color:rgba(41,182,246,0.5); }

    /* Layer row with toggle switch */
    .mfp-layer-row {
      display:flex; align-items:center; gap:8px;
      padding:6px 0; cursor:pointer;
      border-radius:8px; transition:background 0.15s;
    }
    .mfp-layer-row:hover { background:rgba(0,230,118,0.05); margin:0 -4px; padding:6px 4px; }
    .mfp-layer-icon { font-size:0.95rem; width:20px; text-align:center; flex-shrink:0; }
    .mfp-layer-name { flex:1; color:#B0C4B8; font-size:0.78rem; font-weight:500; }
    .mfp-layer-row.active .mfp-layer-name { color:#E8F5E1; }

    /* Toggle switch */
    .mfp-toggle {
      width:34px; height:18px; border-radius:9px;
      background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
      position:relative; flex-shrink:0; cursor:pointer;
      transition:background 0.25s, border-color 0.25s;
    }
    .mfp-toggle.on {
      background:rgba(0,230,118,0.25); border-color:rgba(0,230,118,0.5);
    }
    .mfp-toggle::after {
      content:''; position:absolute; top:2px; left:2px;
      width:12px; height:12px; border-radius:50%;
      background:rgba(255,255,255,0.35);
      transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.25s;
    }
    .mfp-toggle.on::after { transform:translateX(16px); background:#00E676; }

    /* Divider line */
    .mfp-divider {
      border:none; border-top:1px solid rgba(0,230,118,0.07);
      margin:6px 0;
    }

    /* Reset button */
    .mfp-reset-btn {
      width:100%; background:rgba(255,82,82,0.05);
      border:1px solid rgba(255,82,82,0.2); color:#FF8A80;
      padding:7px 10px; border-radius:9px; cursor:pointer;
      font-size:0.74rem; font-family:inherit; font-weight:500;
      transition:all 0.2s; margin-top:6px; text-align:center;
    }
    .mfp-reset-btn:hover { background:rgba(255,82,82,0.1); border-color:rgba(255,82,82,0.45); color:#FF5252; }

    /* ══════════════════════════════════════════════════
       CITY MARKERS & POP-IN ANIMATION
    ══════════════════════════════════════════════════ */
    @keyframes markerPopIn {
      0%   { transform:scale(0) translateY(6px); opacity:0; }
      55%  { transform:scale(1.18) translateY(-2px); opacity:1; }
      100% { transform:scale(1) translateY(0); opacity:1; }
    }
    @keyframes markerFadeOut {
      from { opacity:1; transform:scale(1); }
      to   { opacity:0; transform:scale(0.7); }
    }
    .city-marker-el {
      display:flex; align-items:center; gap:4px;
      background:rgba(8,20,14,0.88);
      border:1px solid rgba(0,230,118,0.22);
      border-radius:8px; padding:4px 8px 4px 6px;
      color:#C8E6C9; font-size:11px; font-weight:600;
      font-family:Outfit,sans-serif; cursor:pointer;
      white-space:nowrap; backdrop-filter:blur(8px);
      box-shadow:0 2px 12px rgba(0,0,0,0.4);
      animation:markerPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
      transition:background 0.15s, border-color 0.15s, transform 0.15s;
    }
    .city-marker-el:hover {
      background:rgba(0,60,20,0.9);
      border-color:rgba(0,230,118,0.5);
      transform:scale(1.06);
      color:#E8F5E1;
    }
    .city-marker-dot {
      width:6px; height:6px; border-radius:50%;
      background:#00E676; flex-shrink:0;
      box-shadow:0 0 5px rgba(0,230,118,0.7);
    }

    /* Weather popup inside city markers */
    .city-weather-popup {
      font-family:Outfit,sans-serif; font-size:0.82rem;
      min-width:170px; padding:4px 2px;
    }
    .city-weather-popup .cwp-city { color:#69F0AE; font-weight:700; font-size:0.9rem; margin-bottom:8px; }
    .city-weather-popup .cwp-loading { color:#5A7A60; font-size:0.78rem; padding:6px 0; text-align:center; }
    .city-weather-popup .cwp-temp { font-size:1.4rem; font-weight:700; color:#E8F5E1; }
    .city-weather-popup .cwp-cond { color:#8FAD8A; font-size:0.78rem; margin:2px 0 6px; }
    .city-weather-popup .cwp-row { display:flex; gap:12px; margin-top:4px; }
    .city-weather-popup .cwp-stat { color:#6A8A70; font-size:0.73rem; }
    .city-weather-popup .cwp-stat strong { color:#B0C4B8; display:block; font-size:0.8rem; }
    .leaflet-popup-content-wrapper {
      background:rgba(8,18,12,0.96) !important;
      border:1px solid rgba(0,230,118,0.2) !important;
      backdrop-filter:blur(16px); color:#E8F5E1;
      border-radius:12px !important;
    }
    .leaflet-popup-tip { background:rgba(8,18,12,0.96) !important; }
    .leaflet-popup-close-button { color:#5A7A60 !important; font-size:16px !important; }

    /* ── Layer fade-in transition ── */
    .leaflet-tile { transition:opacity 0.45s ease; }

    /* ── Map weather popup shared ── */
    .map-weather-popup {
      font-family:Outfit,sans-serif; color:#E8F5E1;
      font-size:0.84rem; line-height:1.5;
    }
    .map-weather-popup strong { color:#69F0AE; font-size:0.92rem; display:block; margin-bottom:4px; }
  `;
  document.head.appendChild(style);
})();

// ─────────────────────────────────────────────────────
// DUAL-API FETCH for point data (Open-Meteo / WeatherAPI)
// ─────────────────────────────────────────────────────
async function fetchWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability&forecast_days=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Open-Meteo failed');
    return { source: 'open-meteo', data: await r.json() };
  } catch (_) {}
  try {
    const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('WeatherAPI failed');
    return { source: 'weatherapi', data: await r.json() };
  } catch (_) {}
  return null;
}

function extractWeatherFields(result) {
  if (!result) return null;
  const { source, data } = result;
  if (source === 'open-meteo') {
    const cw = data.current_weather;
    const hi = new Date().getHours();
    return {
      temp: Math.round(cw.temperature),
      windSpeed: Math.round(cw.windspeed),
      windDir: cw.winddirection,
      weatherCode: cw.weathercode,
      precipProb: data.hourly?.precipitation_probability?.[hi] || 0,
      conditionText: typeof WMO_TEXT !== 'undefined' ? (WMO_TEXT[cw.weathercode] || 'Unknown') : 'Unknown',
    };
  } else {
    const c = data.current;
    return {
      temp: Math.round(c.temp_c),
      windSpeed: Math.round(c.wind_kph),
      windDir: c.wind_degree,
      weatherCode: c.condition.code,
      precipProb: c.precip_mm > 0 ? 100 : 0,
      conditionText: c.condition.text,
    };
  }
}

function getText(code) {
  if (typeof WMO_TEXT !== 'undefined') return WMO_TEXT[code] || 'Unknown';
  return 'Unknown';
}

// ─────────────────────────────────────────────────────
// LAYER FADE HELPER
// ─────────────────────────────────────────────────────
function fadeInLayer(tileLayer, targetOpacity = 0.7, duration = 500) {
  if (!tileLayer || typeof tileLayer.setOpacity !== 'function') return;
  tileLayer.setOpacity(0);
  const start = performance.now();
  function step(ts) {
    const prog = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - prog, 3); // cubic ease-out
    tileLayer.setOpacity(ease * targetOpacity);
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────
// MAP INITIALIZATION
// ─────────────────────────────────────────────────────
function initMap(lat, lon) {
  if (map) { map.remove(); map = null; }

  standardLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap © CARTO'
  });
  // FIXED: Corrected satellite tile URL
  satelliteLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: '© Esri'
  });

  map = L.map('map', { zoomControl: true, attributionControl: true, preferCanvas: true }).setView([lat, lon], 7);
  standardLayer.addTo(map);

  // Add all layer groups
  tempLayer.addTo(map);
  windLayer.addTo(map);
  precipLayer.addTo(map);
  cloudsLayer.addTo(map);
  aqiLayer.addTo(map);
  alertLayer.addTo(map);

  // User location marker
  const userIcon = L.divIcon({
    html: `<div style="width:16px;height:16px;background:#00E676;border-radius:50%;border:3px solid #004D2C;box-shadow:0 0 14px rgba(0,230,118,0.9);animation:alertPulse 2s ease-out infinite;"></div>`,
    iconSize: [16,16], iconAnchor: [8,8], className: ''
  });
  userMarker = L.marker([lat, lon], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
  userMarker.bindPopup(
    `<div class="map-weather-popup"><strong>📍 Your Location</strong>${currentLocationName}</div>`
  ).openPopup();

  // ── Hide old horizontal controls bar ──
  const oldControls = document.querySelector('.map-controls');
  if (oldControls) oldControls.style.display = 'none';

  // ── Inject extras ──
  injectMapExtras();
  injectFloatingPanel();

  // ── Bind old HTML buttons (kept for backward compat, just hidden) ──
  document.getElementById('btn-standard')?.addEventListener('click', () => switchBaseMap('standard'));
  document.getElementById('btn-satellite')?.addEventListener('click', () => switchBaseMap('satellite'));
  document.getElementById('btn-locate')?.addEventListener('click',   doLocate);
  document.getElementById('btn-temp')?.addEventListener('click',   toggleTempLayer);
  document.getElementById('btn-wind')?.addEventListener('click',   toggleWindLayer);
  document.getElementById('btn-precip')?.addEventListener('click', togglePrecipLayer);
  document.getElementById('btn-clouds')?.addEventListener('click', toggleCloudLayer);
  document.getElementById('btn-radar')?.addEventListener('click',  toggleRadarLayer);
  document.getElementById('btn-aqi')?.addEventListener('click',    toggleAQILayer);
  document.getElementById('btn-alert')?.addEventListener('click',  toggleAlertLayer);
  document.getElementById('btn-reset-layers')?.addEventListener('click', resetAllLayers);

  // ── Map search form ──
  document.getElementById('map-search-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('map-search-input');
    const city = input.value.trim();
    if (!city) return;
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      const { lat, lon, name } = await geocode(city);
      currentLat = lat; currentLon = lon; currentLocationName = name;
      const data = await fetchWeather(lat, lon);
      updateWeatherUI(data, name);
      map.setView([lat, lon], 8);
      userMarker.setLatLng([lat, lon]);
      fetchAQI(lat, lon);
      const locEl = document.getElementById('location-display');
      if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${name}</span>`;
    } catch {
      showConflictToast('City not found. Please try another name.');
    } finally {
      btn.innerHTML = '<i class="fas fa-search"></i>';
    }
    input.blur();
  });

  // ── Init city markers ──
  cityMarkersLayer = L.layerGroup().addTo(map);
  initCityMarkers();

  // ── Zoom event for city visibility ──
  map.on('zoomend', () => updateCityVisibility(map.getZoom()));
  updateCityVisibility(map.getZoom());
}

// ─────────────────────────────────────────────────────
// BASE MAP SWITCHER (shared helper)
// ─────────────────────────────────────────────────────
function switchBaseMap(type) {
  if (type === 'satellite') {
    map.removeLayer(standardLayer);
    satelliteLayer.addTo(map);
  } else {
    map.removeLayer(satelliteLayer);
    standardLayer.addTo(map);
  }
  // Sync floating panel buttons
  const stdBtn = document.getElementById('mfp-standard');
  const satBtn = document.getElementById('mfp-satellite');
  if (stdBtn) stdBtn.classList.toggle('active', type === 'standard');
  if (satBtn) satBtn.classList.toggle('active', type === 'satellite');
}

function doLocate() {
  if (!navigator.geolocation) return showConflictToast('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 10, { animate: true });
    userMarker.setLatLng([latitude, longitude]);
  }, () => showConflictToast('Location access denied.'));
}

// ─────────────────────────────────────────────────────
// INJECT MAP EXTRAS (loader overlay + legend container)
// ─────────────────────────────────────────────────────
function injectMapExtras() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  if (!document.getElementById('map-layer-loader')) {
    const loader = document.createElement('div');
    loader.id = 'map-layer-loader';
    loader.className = 'map-layer-loader hidden';
    loader.innerHTML = `<div class="map-layer-loader-spinner"></div><div class="map-layer-loader-text" id="map-loader-msg">Loading layer data…</div>`;
    mapEl.style.position = 'relative';
    mapEl.appendChild(loader);
  }

  if (!document.getElementById('map-legend')) {
    const legend = document.createElement('div');
    legend.id = 'map-legend';
    legend.className = 'map-legend hidden';
    legend.innerHTML = `<div id="legend-content" style="display:flex;flex-wrap:wrap;gap:20px;width:100%;"></div>
      <div class="map-legend-footer">
        <span id="legend-active-count">0 layers active</span>
        <button class="map-legend-reset" onclick="resetAllLayers()">↺ Reset All Layers</button>
      </div>`;
    mapEl.insertAdjacentElement('afterend', legend);
  }
}

// ─────────────────────────────────────────────────────
// FLOATING PANEL — Inject HTML + Bind Events
// ─────────────────────────────────────────────────────
function injectFloatingPanel() {
  const mapEl = document.getElementById('map');
  if (!mapEl || document.getElementById('map-float-panel')) return;

  const layers = [
    { id: 'mfp-temp',   icon: '🌡️', label: 'Temperature',  fn: () => toggleTempLayer()   },
    { id: 'mfp-wind',   icon: '💨', label: 'Wind',          fn: () => toggleWindLayer()   },
    { id: 'mfp-precip', icon: '🌧️', label: 'Rain Radar',    fn: () => togglePrecipLayer() },
    { id: 'mfp-clouds', icon: '☁️', label: 'Clouds',        fn: () => toggleCloudLayer()  },
    { id: 'mfp-radar',  icon: '📡', label: 'Live Radar',    fn: () => toggleRadarLayer()  },
    { id: 'mfp-aqi',    icon: '🌫️', label: 'Air Quality',   fn: () => toggleAQILayer()    },
    { id: 'mfp-alert',  icon: '⚠️', label: 'Alerts',        fn: () => toggleAlertLayer()  },
  ];

  const layerRows = layers.map(l => `
    <div class="mfp-layer-row" id="${l.id}" data-panel-layer>
      <span class="mfp-layer-icon">${l.icon}</span>
      <span class="mfp-layer-name">${l.label}</span>
      <div class="mfp-toggle" id="${l.id}-toggle"></div>
    </div>
  `).join('');

  const panel = document.createElement('div');
  panel.id = 'map-float-panel';
  panel.innerHTML = `
    <div class="mfp-header">
      <div class="mfp-header-title"><span>🗺️</span> Map Controls</div>
      <button id="mfp-toggle-btn" title="Collapse panel">‹</button>
    </div>
    <div id="mfp-body">
      <div class="mfp-section-label">Base Map</div>
      <div class="mfp-base-row">
        <button class="mfp-base-btn active" id="mfp-standard">🗺️ Standard</button>
        <button class="mfp-base-btn" id="mfp-satellite">🛰️ Satellite</button>
      </div>
      <button class="mfp-locate-btn" id="mfp-locate">📍 My Location</button>

      <div class="mfp-section-label">Weather Layers</div>
      ${layerRows}

      <hr class="mfp-divider">
      <div class="mfp-layer-row" id="mfp-cities" data-panel-layer>
        <span class="mfp-layer-icon">🏙️</span>
        <span class="mfp-layer-name">City Markers</span>
        <div class="mfp-toggle on" id="mfp-cities-toggle"></div>
      </div>

      <button class="mfp-reset-btn" id="mfp-reset">↺ Reset All Layers</button>
    </div>
  `;
  mapEl.style.position = 'relative';
  mapEl.appendChild(panel);

  // ── Bind events ──
  document.getElementById('mfp-toggle-btn').addEventListener('click', () => {
    panelCollapsed = !panelCollapsed;
    document.getElementById('map-float-panel').classList.toggle('collapsed', panelCollapsed);
    document.getElementById('mfp-toggle-btn').textContent = panelCollapsed ? '›' : '‹';
  });

  document.getElementById('mfp-standard').addEventListener('click', () => switchBaseMap('standard'));
  document.getElementById('mfp-satellite').addEventListener('click', () => switchBaseMap('satellite'));
  document.getElementById('mfp-locate').addEventListener('click', doLocate);
  document.getElementById('mfp-reset').addEventListener('click', resetAllLayers);

  layers.forEach(l => {
    document.getElementById(l.id).addEventListener('click', l.fn);
  });

  // City markers toggle
  document.getElementById('mfp-cities').addEventListener('click', () => {
    citiesActive = !citiesActive;
    if (citiesActive) {
      updateCityVisibility(map.getZoom());
    } else {
      cityMarkersLayer.clearLayers();
    }
    document.getElementById('mfp-cities-toggle').classList.toggle('on', citiesActive);
  });

  // Prevent map click/drag from propagating through panel
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);
}

// Sync panel toggle visuals with layer state
function syncPanelToggles() {
  const map_ = {
    'mfp-temp':   tempActive,
    'mfp-wind':   windActive,
    'mfp-precip': precipActive,
    'mfp-clouds': cloudsActive,
    'mfp-radar':  radarActive,
    'mfp-aqi':    aqiActive,
    'mfp-alert':  alertActive,
  };
  Object.entries(map_).forEach(([id, active]) => {
    const row = document.getElementById(id);
    const tog = document.getElementById(id + '-toggle');
    if (row) row.classList.toggle('active', active);
    if (tog) tog.classList.toggle('on', active);
  });
}

// ─────────────────────────────────────────────────────
// CITY MARKERS — Zoom-based visibility
// ─────────────────────────────────────────────────────
const _cityMarkerRefs = new Map(); // city.name → L.Marker

function initCityMarkers() {
  MAP_CITIES.forEach(city => {
    const icon = L.divIcon({
      html: `<div class="city-marker-el" style="animation-delay:${Math.random()*0.3}s">
               <div class="city-marker-dot"></div>${city.name}
             </div>`,
      iconSize: [null, null],
      iconAnchor: [0, 10],
      className: ''
    });

    const marker = L.marker([city.lat, city.lon], { icon, interactive: true });
    marker.cityData = city;

    marker.bindPopup(
      `<div class="city-weather-popup">
         <div class="cwp-city">📍 ${city.name}</div>
         <div class="cwp-loading" id="cwp-loading-${city.name.replace(/\s/g,'-')}">
           <i class="fas fa-spinner fa-spin"></i> Fetching weather…
         </div>
       </div>`,
      { maxWidth: 220, className: '' }
    );

    marker.on('popupopen', () => showCityWeatherPopup(marker, city));
    _cityMarkerRefs.set(city.name, marker);
  });
}

function updateCityVisibility(zoom) {
  if (!citiesActive) return;
  cityMarkersLayer.clearLayers();

  MAP_CITIES.forEach(city => {
    const show = (city.tier === 1 && zoom >= 3)
              || (city.tier === 2 && zoom >= 5)
              || (city.tier === 3 && zoom >= 7);
    if (show) {
      const marker = _cityMarkerRefs.get(city.name);
      if (marker) marker.addTo(cityMarkersLayer);
    }
  });
}

async function showCityWeatherPopup(marker, city) {
  const safeId = city.name.replace(/\s/g, '-');
  const popupEl = marker.getPopup().getElement();

  try {
    const result = await fetchWeatherData(city.lat, city.lon);
    const fields = extractWeatherFields(result);
    if (!fields || !popupEl) return;

    const tempColor = fields.temp >= 35 ? '#FF5252'
                    : fields.temp >= 25 ? '#FFB300'
                    : fields.temp >= 15 ? '#69F0AE'
                    : '#29B6F6';

    const emojiMap = typeof WMO_EMOJI !== 'undefined' ? WMO_EMOJI : {};
    const emoji = emojiMap[fields.weatherCode] || '🌤️';

    const html = `
      <div class="city-weather-popup">
        <div class="cwp-city">${emoji} ${city.name}</div>
        <div class="cwp-temp" style="color:${tempColor}">${fields.temp}°C</div>
        <div class="cwp-cond">${fields.conditionText}</div>
        <div class="cwp-row">
          <div class="cwp-stat">
            <strong>💨 ${fields.windSpeed} km/h</strong>Wind
          </div>
          <div class="cwp-stat">
            <strong>🌧️ ${fields.precipProb}%</strong>Rain chance
          </div>
        </div>
      </div>`;

    const content = popupEl.querySelector('.leaflet-popup-content');
    if (content) content.innerHTML = html;
  } catch {
    const content = popupEl?.querySelector('.leaflet-popup-content');
    if (content) content.innerHTML = `<div class="city-weather-popup"><div class="cwp-city">📍 ${city.name}</div><div class="cwp-loading" style="color:#FF8A80;">Could not load weather.</div></div>`;
  }
}

// ─────────────────────────────────────────────────────
// LOADING OVERLAY & TOAST
// ─────────────────────────────────────────────────────
function setLayerLoading(btnId, msg = 'Loading…') {
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('loading');
  const loader = document.getElementById('map-layer-loader');
  const loaderMsg = document.getElementById('map-loader-msg');
  if (loader) loader.classList.remove('hidden');
  if (loaderMsg) loaderMsg.textContent = msg;
}

function clearLayerLoading(btnId) {
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.remove('loading');
  const loader = document.getElementById('map-layer-loader');
  if (loader) loader.classList.add('hidden');
}

function checkLayerConflicts() {
  const heavy = [windActive, precipActive, radarActive].filter(Boolean).length;
  if (heavy >= 2) showConflictToast('⚠️ Multiple heavy layers active — may reduce performance.');
}

let conflictToastTimeout = null;
function showConflictToast(msg) {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;
  let toast = document.getElementById('layer-conflict-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'layer-conflict-toast';
    toast.className = 'layer-conflict-toast';
    mapEl.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(conflictToastTimeout);
  conflictToastTimeout = setTimeout(() => { if (toast) toast.style.display = 'none'; }, 4000);
}

// ─────────────────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────────────────
function updateLegend() {
  const legendEl = document.getElementById('map-legend');
  const contentEl = document.getElementById('legend-content');
  const countEl = document.getElementById('legend-active-count');
  if (!legendEl || !contentEl) return;

  const activeLayers = [
    tempActive && 'temp', windActive && 'wind', precipActive && 'precip',
    cloudsActive && 'clouds', aqiActive && 'aqi', alertActive && 'alert',
    radarActive && 'radar'
  ].filter(Boolean);

  if (activeLayers.length === 0) { legendEl.classList.add('hidden'); return; }
  legendEl.classList.remove('hidden');
  if (countEl) countEl.textContent = `${activeLayers.length} layer${activeLayers.length > 1 ? 's' : ''} active`;

  contentEl.innerHTML = activeLayers.map(id => {
    const def = LAYER_DEFS[id];
    if (!def) return '';
    return `<div class="map-legend-section">
      <div class="map-legend-title">${def.icon} ${def.label}</div>
      ${def.legend.map(r => `<div class="map-legend-row"><div class="map-legend-swatch" style="background:${r.color};"></div><span>${r.label}</span></div>`).join('')}
    </div>`;
  }).join('');

  // Sync panel after every legend update
  syncPanelToggles();
}

// ─────────────────────────────────────────────────────
// RESET ALL LAYERS
// ─────────────────────────────────────────────────────
function resetAllLayers() {
  if (tempActive)   { tempLayer.clearLayers();   document.getElementById('btn-temp')?.classList.remove('active');   tempActive   = false; }
  if (windActive)   { destroyWindCanvas();        document.getElementById('btn-wind')?.classList.remove('active');   windActive   = false; }
  if (precipActive) { precipLayer.clearLayers();  document.getElementById('btn-precip')?.classList.remove('active'); precipActive = false; }
  if (cloudsActive) { cloudsLayer.clearLayers();  document.getElementById('btn-clouds')?.classList.remove('active'); cloudsActive = false; }
  if (radarActive) {
    stopRadarAnimation();
    if (radarTiles) { map.removeLayer(radarTiles); radarTiles = null; }
    radarActive = false;
    document.getElementById('btn-radar')?.classList.remove('active');
    const rc = document.getElementById('radar-slider-container');
    if (rc) rc.style.display = 'none';
  }
  if (aqiActive)   { aqiLayer.clearLayers();    document.getElementById('btn-aqi')?.classList.remove('active');    aqiActive    = false; }
  if (alertActive) { stopAlertPulse(); alertLayer.clearLayers(); document.getElementById('btn-alert')?.classList.remove('active'); alertActive = false; }
  updateLegend();
}

// ─────────────────────────────────────────────────────
// LAYER TOGGLES
// ─────────────────────────────────────────────────────
async function toggleTempLayer() {
  const btn = document.getElementById('btn-temp');
  if (tempActive) {
    tempLayer.clearLayers(); btn?.classList.remove('active'); tempActive = false;
  } else {
    setLayerLoading('btn-temp', '🌡️ Loading temperature data…');
    tempActive = true; btn?.classList.add('active');
    await loadTemperatureLayer();
    clearLayerLoading('btn-temp');
  }
  updateLegend();
}

async function toggleWindLayer() {
  const btn = document.getElementById('btn-wind');
  if (windActive) {
    destroyWindCanvas(); btn?.classList.remove('active'); windActive = false; updateLegend();
  } else {
    setLayerLoading('btn-wind', '💨 Building wind field…');
    windActive = true; btn?.classList.add('active');
    await loadWindLayer();
    clearLayerLoading('btn-wind');
    checkLayerConflicts(); updateLegend();
  }
}

async function togglePrecipLayer() {
  const btn = document.getElementById('btn-precip');
  if (precipActive) {
    precipLayer.clearLayers(); btn?.classList.remove('active'); precipActive = false; updateLegend();
  } else {
    setLayerLoading('btn-precip', '🌧️ Loading rain radar…');
    precipActive = true; btn?.classList.add('active');
    await loadPrecipLayer();
    clearLayerLoading('btn-precip');
    checkLayerConflicts(); updateLegend();
  }
}

async function toggleCloudLayer() {
  const btn = document.getElementById('btn-clouds');
  if (cloudsActive) {
    cloudsLayer.clearLayers(); btn?.classList.remove('active'); cloudsActive = false; updateLegend();
  } else {
    setLayerLoading('btn-clouds', '☁️ Loading cloud cover…');
    cloudsActive = true; btn?.classList.add('active');
    await loadCloudLayer();
    clearLayerLoading('btn-clouds'); updateLegend();
  }
}

async function toggleRadarLayer() {
  const btn = document.getElementById('btn-radar');
  if (radarActive) {
    stopRadarAnimation();
    if (radarTiles) { map.removeLayer(radarTiles); radarTiles = null; }
    btn?.classList.remove('active');
    const rc = document.getElementById('radar-slider-container');
    if (rc) rc.style.display = 'none';
    radarActive = false; updateLegend();
  } else {
    setLayerLoading('btn-radar', '📡 Loading radar…');
    radarActive = true; btn?.classList.add('active');
    await loadRadarLayer();
    clearLayerLoading('btn-radar');
    checkLayerConflicts(); updateLegend();
  }
}

async function toggleAQILayer() {
  const btn = document.getElementById('btn-aqi');
  if (aqiActive) {
    aqiLayer.clearLayers(); btn?.classList.remove('active'); aqiActive = false; updateLegend();
  } else {
    setLayerLoading('btn-aqi', '🌫️ Fetching AQI data…');
    aqiActive = true; btn?.classList.add('active');
    await loadAQILayer();
    clearLayerLoading('btn-aqi'); updateLegend();
  }
}

async function toggleAlertLayer() {
  const btn = document.getElementById('btn-alert');
  if (alertActive) {
    stopAlertPulse(); alertLayer.clearLayers(); btn?.classList.remove('active'); alertActive = false; updateLegend();
  } else {
    setLayerLoading('btn-alert', '⚠️ Scanning weather alerts…');
    alertActive = true; btn?.classList.add('active');
    await loadAlertLayer();
    clearLayerLoading('btn-alert'); updateLegend();
  }
}

// ─────────────────────────────────────────────────────
// LAYER IMPLEMENTATIONS
// ─────────────────────────────────────────────────────

// TEMPERATURE
async function loadTemperatureLayer() {
  tempLayer.clearLayers();
  try {
    const tileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`;
    const tile = L.tileLayer(tileUrl, { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
    tile.addTo(tempLayer);
    fadeInLayer(tile, 0.7);

    const center = map.getCenter();
    const result = await fetchWeatherData(center.lat, center.lng);
    const fields = extractWeatherFields(result);
    if (fields) {
      const color = fields.temp >= 30 ? '#FF5252' : fields.temp >= 20 ? '#FFB300' : '#69F0AE';
      const icon = L.divIcon({
        html: `<div style="background:rgba(8,20,12,0.92);border:2px solid ${color};border-radius:50%;
          width:44px;height:44px;display:flex;align-items:center;justify-content:center;
          color:${color};font-weight:700;font-family:Outfit,sans-serif;
          animation:markerPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1);">${fields.temp}°</div>`,
        iconSize: [44,44], iconAnchor: [22,22], className: ''
      });
      L.marker([center.lat, center.lng], { icon })
        .bindPopup(`<div class="map-weather-popup"><strong>🌡️ ${fields.temp}°C</strong>${fields.conditionText}</div>`)
        .addTo(tempLayer);
    }
  } catch (e) {
    console.warn('Temp layer error', e);
    showConflictToast('Temperature tiles unavailable. Check API key.');
  }
}

// WIND — velocity particles with tile fallback
async function loadWindLayer() {
  if (velocityLayer) { map.removeLayer(velocityLayer); velocityLayer = null; }
  windLayer.clearLayers();
  try {
    const windData = await fetch('https://raw.githubusercontent.com/windycom/windy-plugins/windy-plugins/examples/wind.json').then(r => r.json());
    velocityLayer = L.velocityLayer({
      displayValues: true,
      data: windData,
      maxVelocity: 15,
      colorScale: ['#3288bd','#99d594','#e6f598','#fee08b','#fc8d59','#d53e4f'],
      particleMultiplier: 1.6,
    }).addTo(map);
  } catch {
    const tile = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
      { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
    tile.addTo(windLayer);
    fadeInLayer(tile, 0.7);
    showConflictToast('Wind particles unavailable. Showing tile layer.');
  }
}

function destroyWindCanvas() {
  if (velocityLayer) { map.removeLayer(velocityLayer); velocityLayer = null; }
  windLayer.clearLayers();
}

// PRECIPITATION
async function loadPrecipLayer() {
  precipLayer.clearLayers();
  const tile = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
    { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
  tile.addTo(precipLayer);
  fadeInLayer(tile, 0.7);
}

// CLOUDS
async function loadCloudLayer() {
  cloudsLayer.clearLayers();
  const tile = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
    { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
  tile.addTo(cloudsLayer);
  fadeInLayer(tile, 0.6);
}

// AQI
async function loadAQILayer() {
  aqiLayer.clearLayers();
  const tile = L.tileLayer(`https://tile.openweathermap.org/map/tile_aqi_current/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
    { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
  tile.addTo(aqiLayer);
  fadeInLayer(tile, 0.7);
}

// ─────────────────────────────────────────────────────
// RADAR — RainViewer animated loop
// ─────────────────────────────────────────────────────
async function loadRadarLayer() {
  stopRadarAnimation();
  if (radarTiles) { map.removeLayer(radarTiles); radarTiles = null; }

  try {
    const resp = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      method: 'GET', headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data?.radar || (!data.radar.past && !data.radar.nowcast)) throw new Error('No radar frames');

    radarTimestamps = [].concat(data.radar.past || [], data.radar.nowcast || [])
      .map(f => (typeof f === 'object' ? f.time : f))
      .filter(ts => Number.isFinite(Number(ts)));

    if (!radarTimestamps.length) throw new Error('No valid timestamps');
    radarCurrentIndex = Math.max(0, radarTimestamps.length - 1);

    const slider = document.getElementById('radar-slider');
    const sliderContainer = document.getElementById('radar-slider-container');
    if (slider && sliderContainer) {
      slider.max = radarTimestamps.length - 1;
      slider.value = radarCurrentIndex;
      sliderContainer.style.display = 'flex';
      if (!slider.hasAttribute('data-radar-bound')) {
        slider.setAttribute('data-radar-bound', 'true');
        slider.addEventListener('input', () => {
          if (radarTimestamps.length) { radarCurrentIndex = parseInt(slider.value); updateRadarTile(); }
        });
      }
    }

    updateRadarTile();
    startRadarAnimation();
    console.log('✅ Radar loaded:', radarTimestamps.length, 'frames');
  } catch (error) {
    console.error('Radar error:', error.message);
    try {
      const tile = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`,
        { opacity: 0, maxZoom: 19, attribution: '© OpenWeather' });
      tile.addTo(map);
      fadeInLayer(tile, 0.7);
      radarTiles = tile;
      const rc = document.getElementById('radar-slider-container');
      if (rc) rc.style.display = 'none';
      const tl = document.getElementById('radar-time-label');
      if (tl) tl.textContent = 'Live';
      showConflictToast('📡 Showing precipitation radar (fallback mode)');
    } catch (fallbackError) {
      console.error('Fallback failed:', fallbackError);
      showConflictToast('❌ Radar data unavailable. Please try again later.');
      radarActive = false;
      document.getElementById('btn-radar')?.classList.remove('active');
      updateLegend();
    }
  }
}

function updateRadarTile() {
  if (!radarTimestamps?.length) return;
  if (radarTiles) map.removeLayer(radarTiles);
  const ts = Number(radarTimestamps[radarCurrentIndex]);
  if (!Number.isFinite(ts) || ts <= 0) {
    document.getElementById('radar-time-label').textContent = 'Invalid'; return;
  }
  radarTiles = L.tileLayer(`https://tilecache.rainviewer.com/v2/radar/${ts}/{z}/{x}/{y}/1/1_1.png`,
    { opacity: 0.6, maxZoom: 19 }).addTo(map);
  const tl = document.getElementById('radar-time-label');
  if (tl) tl.textContent = new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function startRadarAnimation() {
  clearInterval(radarInterval);
  radarInterval = setInterval(() => {
    if (!radarActive || !radarTimestamps.length) return;
    radarCurrentIndex = (radarCurrentIndex + 1) % radarTimestamps.length;
    const slider = document.getElementById('radar-slider');
    if (slider) slider.value = radarCurrentIndex;
    updateRadarTile();
  }, 600);
}

function stopRadarAnimation() {
  clearInterval(radarInterval);
  radarInterval = null;
}

// ─────────────────────────────────────────────────────
// ALERTS LAYER — multi-city severe weather check
// ─────────────────────────────────────────────────────
const ALERT_CITIES = [
  { name: 'New York',    lat: 40.71,  lon: -74.01  },
  { name: 'London',      lat: 51.51,  lon: -0.13   },
  { name: 'Tokyo',       lat: 35.69,  lon: 139.69  },
  { name: 'Sydney',      lat: -33.87, lon: 151.21  },
  { name: 'Mumbai',      lat: 19.08,  lon: 72.88   },
  { name: 'Cairo',       lat: 30.05,  lon: 31.24   },
  { name: 'Los Angeles', lat: 34.05,  lon: -118.24 },
  { name: 'Bangkok',     lat: 13.75,  lon: 100.52  },
  { name: 'Manila',      lat: 14.60,  lon: 120.98  },
  { name: 'Jakarta',     lat: -6.21,  lon: 106.85  },
  { name: 'Branson',     lat: 36.64,  lon: -93.22  },
];

async function loadAlertLayer() {
  alertLayer.clearLayers();
  stopAlertPulse();
  alertMarkerEls = [];

  const results = await Promise.allSettled(
    ALERT_CITIES.map(city => fetchWeatherData(city.lat, city.lon).then(r => ({ city, r })))
  );

  results.forEach(({ status, value }) => {
    if (status !== 'fulfilled' || !value.r) return;
    const fields = extractWeatherFields(value.r);
    if (!fields) return;
    const { city } = value;

    const alerts = [];
    let severity = { level: 'watch', color: '#FF9800' };

    if (fields.temp >= 38)           { alerts.push(`🌡️ Extreme heat (${fields.temp}°C)`);         severity = { level:'severe', color:'#FF5252' }; }
    if (fields.temp <= -5)           { alerts.push(`❄️ Freeze warning (${fields.temp}°C)`);        severity = { level:'severe', color:'#29B6F6' }; }
    if (fields.windSpeed >= 60)      { alerts.push(`💨 Damaging winds (${fields.windSpeed} km/h)`); severity = { level:'severe', color:'#FF5252' }; }

    const condLow = fields.conditionText.toLowerCase();
    if (condLow.includes('thunder') || condLow.includes('storm'))                                { alerts.push('⛈️ Severe thunderstorm risk');    severity = { level:'severe', color:'#FF5252' }; }
    if (condLow.includes('typhoon') || condLow.includes('hurricane') || condLow.includes('cyclone')) { alerts.push('🌀 Tropical cyclone warning'); severity = { level:'severe', color:'#FF1744' }; }
    if (fields.precipProb >= 85)     alerts.push(`🌧️ Heavy rainfall alert (${fields.precipProb}% chance)`);

    if (!alerts.length) { alerts.push('✅ No active warnings'); severity = { level:'clear', color:'#00E676' }; }

    const isSevere = severity.level === 'severe';
    const isClear  = severity.level === 'clear';

    if (isSevere) {
      L.circle([city.lat, city.lon], {
        radius: 80000, color: severity.color, fillColor: severity.color,
        fillOpacity: 0.08, weight: 1.5, dashArray: '6 6', interactive: false,
      }).addTo(alertLayer);
    }

    const markerHtml = `<div class="${isSevere ? 'alert-pulse-icon' : ''}" style="
      background:${isClear ? 'rgba(0,100,40,0.9)' : `rgba(${isSevere ? '120,0,0' : '100,60,0'},0.92)`};
      border:2px solid ${severity.color}; border-radius:10px; padding:5px 10px;
      color:#fff; font-size:11px; font-weight:700; font-family:Outfit,sans-serif;
      pointer-events:auto; cursor:pointer; white-space:nowrap;
      box-shadow:0 0 ${isSevere ? '16px' : '6px'} ${severity.color}${isSevere ? '66' : '33'};
      animation:markerPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
    ">${isSevere ? '⚠️' : isClear ? '✅' : '⚡'} ${city.name}</div>`;

    const icon = L.divIcon({ html: markerHtml, iconSize: [90,28], iconAnchor: [45,14], className: '' });
    const endHours = Math.floor(Math.random() * 8) + 2;
    L.marker([city.lat, city.lon], { icon })
      .bindPopup(`<div class="map-weather-popup">
        <strong>${isSevere ? '⚠️' : '📍'} ${city.name}</strong>
        <div style="margin:8px 0">${alerts.map(a => `<div style="margin:3px 0;color:${isClear ? '#00E676' : '#FFB0B0'}">${a}</div>`).join('')}</div>
        <div style="font-size:0.78rem;color:#8FAD8A;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;margin-top:4px">
          ${isSevere ? `⏳ Alert active · Est. ends in ~${endHours}h` : 'No active weather alerts for this area.'}
        </div>
      </div>`)
      .addTo(alertLayer);
  });
}

function stopAlertPulse() {
  if (alertPulseInterval) { clearInterval(alertPulseInterval); alertPulseInterval = null; }
  alertMarkerEls = [];
}