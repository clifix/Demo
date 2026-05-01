// ═══════════════════════════════════════════════════════════════════════════
// CLIFIX HERO UPGRADE — hero-upgrade.js
// ═══════════════════════════════════════════════════════════════════════════

const ClifixHero = (function () {
  'use strict';

  // ─── Internal state ────────────────────────────────────────────────────────
  const state = {
    temp:        '--',
    condition:   'Partly Cloudy',
    condIcon:    '🌤️',
    windSpeed:   '--',
    windDir:     '--',
    humidity:    '--',
    pressure:    '--',
    aqiVal:      '--',
    aqiCat:      'Unknown',
    uvIndex:     '--',
    location:    'Your Location',
    co2:         '--',               // NEW: store CO₂ value
    forecast:    [],                // [{day,icon,hi,lo}]
    lat:         null,
    lon:         null,
  };

  // ─── WMO icon map (mirrors config.js WMO_EMOJI) ───────────────────────────
  const WMO_ICON = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
    71:'❄️',73:'❄️',75:'❄️',77:'🌨️',80:'🌦️',81:'🌧️',82:'⛈️',
    95:'⛈️',96:'⛈️',99:'⛈️',
  };

  // ─── AQI helpers ──────────────────────────────────────────────────────────
  function aqiCategory(v) {
    if (v <=  50) return { cat: 'Good',        color: '#00E676' };
    if (v <= 100) return { cat: 'Moderate',    color: '#FFD600' };
    if (v <= 150) return { cat: 'Unhealthy+',  color: '#FF8C00' };
    if (v <= 200) return { cat: 'Unhealthy',   color: '#D50000' };
    if (v <= 300) return { cat: 'Very Unhealthy', color: '#9C27B0' };
    return               { cat: 'Hazardous',   color: '#7E0023' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1A — AURORA CANVAS BACKGROUND
  // ══════════════════════════════════════════════════════════════════════════
  function initAurora() {
    const canvas = document.getElementById('hero-aurora');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    let t = 0;

    const bands = [
      { cx: 0.5, cy: 0.35, rx: 0.65, ry: 0.22, hue: 152, phase: 0,    speed: 0.0008 },
      { cx: 0.3, cy: 0.55, rx: 0.45, ry: 0.18, hue: 180, phase: 2.1,  speed: 0.0012 },
      { cx: 0.72,cy: 0.28, rx: 0.5,  ry: 0.20, hue: 140, phase: 1.0,  speed: 0.0006 },
    ];

    let stars = [];

    function resize() {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.1 + 0.2,
        o: Math.random() * 0.5 + 0.1,
        blink: Math.random() * Math.PI * 2,
        bs: Math.random() * 0.02 + 0.004,
      }));
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx.clearRect(0, 0, w, h);
      t++;

      stars.forEach(s => {
        s.blink += s.bs;
        const alpha = s.o * (0.6 + Math.sin(s.blink) * 0.4);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,237,216,${alpha})`;
        ctx.fill();
      });

      bands.forEach(b => {
        const px  = b.cx + Math.sin(t * b.speed + b.phase) * 0.12;
        const py  = b.cy + Math.cos(t * b.speed * 0.7 + b.phase) * 0.08;
        const rx  = (b.rx + Math.sin(t * b.speed * 0.5) * 0.06) * w;
        const ry  = (b.ry + Math.cos(t * b.speed * 0.4) * 0.04) * h;
        const cx  = px * w;
        const cy  = py * h;
        const alpha = 0.055 + Math.sin(t * b.speed * 2 + b.phase) * 0.025;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, ry / rx);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        grad.addColorStop(0, `hsla(${b.hue},100%,55%,${alpha})`);
        grad.addColorStop(0.5, `hsla(${b.hue},80%,45%,${alpha * 0.5})`);
        grad.addColorStop(1, `hsla(${b.hue},60%,30%,0)`);

        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      const hor = ctx.createLinearGradient(0, h * 0.7, 0, h);
      hor.addColorStop(0, 'rgba(0,230,118,0)');
      hor.addColorStop(1, 'rgba(0,64,30,0.15)');
      ctx.fillStyle = hor;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      requestAnimationFrame(draw);
    }

    draw();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1B — TIME-OF-DAY THEME
  // ══════════════════════════════════════════════════════════════════════════
  function applyTimeOfDay() {
    const hour = new Date().getHours();
    const hero = document.getElementById('hero');
    if (!hero) return;

    let theme, vars;

    if (hour >= 5 && hour < 11) {
      theme = 'tod-morning';
      vars  = {
        '--tod-primary':   '#4CEBA0',
        '--tod-secondary': '#26C6DA',
        '--tod-glow':      'rgba(76,235,160,0.15)',
        '--tod-bg-mid':    '#09140F',
        '--tod-aurora-a':  'rgba(76,235,160,0.07)',
      };
    } else if (hour >= 11 && hour < 17) {
      theme = 'tod-afternoon';
      vars  = {
        '--tod-primary':   '#00E676',
        '--tod-secondary': '#1DE9B6',
        '--tod-glow':      'rgba(0,230,118,0.22)',
        '--tod-bg-mid':    '#0A130D',
        '--tod-aurora-a':  'rgba(0,230,118,0.09)',
      };
    } else if (hour >= 17 && hour < 21) {
      theme = 'tod-evening';
      vars  = {
        '--tod-primary':   '#69F0AE',
        '--tod-secondary': '#FFD54F',
        '--tod-glow':      'rgba(105,240,174,0.14)',
        '--tod-bg-mid':    '#0B1209',
        '--tod-aurora-a':  'rgba(105,240,174,0.06)',
      };
    } else {
      theme = 'tod-night';
      vars  = {
        '--tod-primary':   '#00E676',
        '--tod-secondary': '#00BFA5',
        '--tod-glow':      'rgba(0,230,118,0.12)',
        '--tod-bg-mid':    '#070D0A',
        '--tod-aurora-a':  'rgba(0,230,118,0.04)',
      };
    }

    hero.className = hero.className.replace(/tod-\w+/g, '').trim() + ' ' + theme;
    Object.entries(vars).forEach(([k, v]) => hero.style.setProperty(k, v));

    const greet = document.getElementById('hero-greeting');
    if (greet) {
      const greetings = {
        'tod-morning':   '🌅 Good morning',
        'tod-afternoon': '☀️ Good afternoon',
        'tod-evening':   '🌆 Good evening',
        'tod-night':     '🌙 Good night',
      };
      greet.textContent = greetings[theme] || '🌍 Live';
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — TYPEWRITER ROTATING TEXT
  // ══════════════════════════════════════════════════════════════════════════
  function initTypewriter() {
    const el = document.getElementById('hero-typewriter-text');
    if (!el) return;

    const lines = [
      'Tracking real-time climate shifts...',
      'Monitoring air quality worldwide.',
      'Your environmental command center.',
      'Eco intelligence at your fingertips.',
      'See the planet. Act for the planet.',
    ];

    let lineIdx = 0, charIdx = 0, deleting = false, waiting = false;

    function tick() {
      const line = lines[lineIdx];
      if (waiting) return;

      if (!deleting) {
        charIdx++;
        el.textContent = line.slice(0, charIdx);
        if (charIdx === line.length) {
          waiting = true;
          setTimeout(() => { waiting = false; deleting = true; }, 2400);
        }
      } else {
        charIdx--;
        el.textContent = line.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          lineIdx = (lineIdx + 1) % lines.length;
        }
      }
    }

    setInterval(tick, deleting ? 38 : 52);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — LIVE CLIMATE HEADLINE STRIP
  // ══════════════════════════════════════════════════════════════════════════
  function updateClimateStrip() {
    // Location pill
    const pillLoc = document.getElementById('pill-location');
    if (pillLoc) pillLoc.textContent = state.location;

    // Temp chip
    const chipTemp = document.getElementById('chip-temp');
    if (chipTemp) chipTemp.innerHTML = `<span class="chip-val">${state.temp}°C</span>`;

    // Wind chip
    const chipWind = document.getElementById('chip-wind');
    if (chipWind) chipWind.innerHTML = `💨 <span class="chip-val">${state.windSpeed} km/h</span>`;

    // CO₂ chip (NEW)
    const chipCO2 = document.getElementById('chip-co2');
    if (chipCO2 && state.co2 !== '--') {
      chipCO2.innerHTML = `🌍 CO₂ <span class="chip-val">${state.co2} ppm</span>`;
    }

    // AQI chip
    const chipAQI = document.getElementById('chip-aqi');
    if (chipAQI && state.aqiVal !== '--') {
      const { cat, color } = aqiCategory(+state.aqiVal);
      chipAQI.style.borderColor = color + '50';
      chipAQI.innerHTML = `🌫️ AQI&nbsp;<span class="chip-val" style="color:${color};text-shadow:0 0 10px ${color}55">${state.aqiVal}</span>&nbsp;<span style="font-size:10px;color:${color}">${cat}</span>`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 4 — CTA RIPPLE
  // ══════════════════════════════════════════════════════════════════════════
  function initCTARipple() {
    document.querySelectorAll('.btn-hero-primary').forEach(btn => {
      btn.addEventListener('click', e => {
        const r = document.createElement('span');
        r.className = 'btn-ripple';
        const rect = btn.getBoundingClientRect();
        r.style.left = (e.clientX - rect.left) + 'px';
        r.style.top  = (e.clientY - rect.top)  + 'px';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 700);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 5 — WEATHER SNAPSHOT CARD
  // ══════════════════════════════════════════════════════════════════════════
  function updateSnapshotCard() {
    // Main temp & icon
    const cardIcon = document.getElementById('wsc-icon');
    const cardTemp = document.getElementById('wsc-temp');
    const cardCond = document.getElementById('wsc-condition');
    if (cardIcon) cardIcon.textContent = state.condIcon;
    if (cardTemp) cardTemp.innerHTML   = `${state.temp}<span class="deg">°C</span>`;
    if (cardCond) cardCond.textContent = state.condition;

    // Stats
    const statWind = document.getElementById('wsc-wind');
    const statHum  = document.getElementById('wsc-humidity');
    const statUV   = document.getElementById('wsc-uv');
    if (statWind) statWind.textContent = state.windSpeed !== '--' ? state.windSpeed + ' km/h' : '--';
    if (statHum)  statHum.textContent  = state.humidity  !== '--' ? state.humidity  + '%'    : '--';
    if (statUV)   statUV.textContent   = state.uvIndex   !== '--' ? state.uvIndex             : '--';

    // AQI bar
    if (state.aqiVal !== '--') {
      const pct  = Math.min((+state.aqiVal / 300) * 100, 100);
      const fill  = document.getElementById('aqi-fill');
      const thumb = document.getElementById('aqi-thumb');
      const badge = document.getElementById('aqi-badge');
      const cat   = document.getElementById('aqi-cat-text');
      const info  = aqiCategory(+state.aqiVal);

      if (fill)  fill.style.width  = pct + '%';
      if (thumb) thumb.style.left  = `calc(${pct}% - 5px)`;
      if (badge) { badge.textContent = state.aqiVal; badge.style.color = info.color; }
      if (cat)   { cat.textContent  = info.cat; cat.style.color = info.color; }
    }

    // Mini forecast
    const forecastWrap = document.getElementById('wsc-forecast');
    if (forecastWrap && state.forecast.length) {
      forecastWrap.innerHTML = state.forecast.slice(0, 5).map(d => `
        <div class="wsc-fc-day">
          <span class="fc-day-name">${d.day}</span>
          <span class="fc-day-icon">${d.icon}</span>
          <span class="fc-day-temps"><span class="fc-hi">${d.hi}°</span>/<span>${d.lo}°</span></span>
        </div>
      `).join('');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — SCROLL-TRIGGERED TRANSITION (hero content stays visible)
  // ══════════════════════════════════════════════════════════════════════════
  function initScrollTransition() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const heroH   = hero.offsetHeight;
          const pct     = Math.min(scrollY / (heroH * 0.45), 1);

          const inner = hero.querySelector('.hero-inner');
          if (inner) {
            // Hero content stays fully visible – fade-out removed
            // inner.style.opacity   = 1 - pct * 1.3;
            // inner.style.transform = `translateY(${-pct * 30}px)`;
          }

          const aurora = document.getElementById('hero-aurora');
          if (aurora) aurora.style.transform = `translateY(${scrollY * 0.35}px)`;

          const scrollInd = hero.querySelector('.hero-scroll-indicator');
          if (scrollInd) scrollInd.style.opacity = Math.max(0, 1 - pct * 4);

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    const scrollBtn = document.querySelector('.hero-scroll-indicator');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        const next = hero.nextElementSibling;
        if (next) next.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 7 — NOTIFICATION TEASER
  // ══════════════════════════════════════════════════════════════════════════
  function showNotification(opts = {}) {
    const {
      icon    = '🌧️',
      type    = 'warn',
      title   = 'Weather Alert',
      desc    = 'Check your local forecast.',
      cta     = 'View alerts →',
      delay   = 3000,
      autoHide = 8000,
      onClick = () => {},
    } = opts;

    let teaser = document.getElementById('hero-notif-teaser');
    if (!teaser) {
      teaser = document.createElement('div');
      teaser.id = 'hero-notif-teaser';
      document.body.appendChild(teaser);
    }

    teaser.innerHTML = `
      <div class="notif-icon-wrap notif-${type}">${icon}</div>
      <div class="notif-body">
        <div class="notif-title">${title}</div>
        <div class="notif-desc">${desc}</div>
        <div class="notif-cta">${cta}</div>
      </div>
      <button class="notif-close" aria-label="Close">✕</button>
    `;

    teaser.querySelector('.notif-close').addEventListener('click', e => {
      e.stopPropagation();
      dismissNotif(teaser);
    });

    teaser.addEventListener('click', () => {
      onClick();
      dismissNotif(teaser);
    });

    setTimeout(() => teaser.classList.add('show'), delay);
    if (autoHide) setTimeout(() => dismissNotif(teaser), delay + autoHide);
  }

  function dismissNotif(teaser) {
    teaser.classList.remove('show');
  }

  function autoNotification() {
    const wc   = typeof currentWeatherData !== 'undefined' && currentWeatherData?.current_weather;
    const aqi  = +state.aqiVal;
    const temp = +state.temp;

    if (wc && [95,96,99].includes(wc.weathercode)) {
      showNotification({
        icon: '⛈️', type: 'warn',
        title: 'Thunderstorm Alert',
        desc: 'Severe thunderstorm detected in your area. Stay safe indoors.',
        cta: 'View radar →',
        delay: 3500,
        onClick: () => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }),
      });
    } else if (!isNaN(aqi) && aqi > 150) {
      showNotification({
        icon: '😷', type: 'warn',
        title: `Unhealthy Air Quality — AQI ${aqi}`,
        desc: 'Limit outdoor activity. Wear a mask if going outside.',
        cta: 'View AQI details →',
        delay: 3500,
      });
    } else if (!isNaN(temp) && temp > 37) {
      showNotification({
        icon: '🌡️', type: 'warn',
        title: `Heat Warning — ${temp}°C`,
        desc: 'Stay hydrated and avoid prolonged sun exposure.',
        cta: 'See eco tips →',
        delay: 3500,
      });
    } else {
      showNotification({
        icon: '🌿', type: 'good',
        title: 'Great day to go green!',
        desc: `Air quality is ${state.aqiCat || 'good'}. Perfect for outdoor eco-actions.`,
        cta: 'Log an eco action →',
        delay: 4000,
        onClick: () => document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth' }),
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 8 — HERO MINI MAP
  // ══════════════════════════════════════════════════════════════════════════
  function initHeroMiniMap() {
    const container = document.getElementById('hero-mini-map');
    if (!container || typeof L === 'undefined') return;
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    const miniMap = L.map('hero-mini-map', {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      keyboard: false,
      touchZoom: false,
    }).setView([state.lat || 13.41, state.lon || 122.56], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      opacity: 0.6,
    }).addTo(miniMap);

    const cities = [
      { name: 'Manila',  lat: 14.59, lon: 120.98 },
      { name: 'Cebu',    lat: 10.32, lon: 123.90 },
      { name: 'San Francisco',  lat: 8.51,  lon: 125.98 },
      { name: 'Davao',   lat: 7.07,  lon: 125.61 },
      { name: 'Baguio',  lat: 16.40, lon: 120.60 },
      { name: 'Palawan', lat: 9.83,  lon: 118.74},
      { name: 'butuan',  lat: 8.95,  lon: 125.56 },
    ];

    cities.forEach(city => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:8px;height:8px;border-radius:50%;background:#00E676;box-shadow:0 0 0 0 rgba(0,230,118,0.6);animation:heroMapPulse 2.5s ease-out infinite;"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      L.marker([city.lat, city.lon], { icon }).addTo(miniMap)
        .bindTooltip(city.name, { permanent: false, className: 'cfx-mini-tooltip' });
    });

    // Inject mini map + gradient animation CSS if not already present
    if (!document.getElementById('hero-minimap-css')) {
      const s = document.createElement('style');
      s.id = 'hero-minimap-css';
      s.textContent = `
        @keyframes heroMapPulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,230,118,0.7); }
          70%  { box-shadow: 0 0 0 12px rgba(0,230,118,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,230,118,0); }
        }
        .cfx-mini-tooltip {
          background: rgba(7,13,10,0.9) !important;
          border: 1px solid rgba(0,230,118,0.3) !important;
          color: #00E676 !important;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px !important;
          border-radius: 5px !important;
          box-shadow: none !important;
        }
        .cfx-mini-tooltip::before { display: none; }
        #hero-mini-map { pointer-events: none; }

        /* ── MOVING GRADIENT BACKGROUND ── */
        @keyframes heroGradientShift {
          0%   { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50%  { transform: translate(-50%, -50%) rotate(180deg) scale(1.08); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }
        #hero-gradient-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }
        #hero-gradient-bg::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 140vmax; height: 140vmax;
          background: radial-gradient(circle at 60% 40%,
            rgba(0,210,100,0.06) 0%,
            rgba(0,100,60,0.04) 30%,
            rgba(0,50,30,0.02) 60%,
            transparent 80%
          );
          animation: heroGradientShift 24s ease-in-out infinite;
        }
      `;
      document.head.appendChild(s);
    }

    const hero = document.getElementById('hero');
    if (hero) {
      hero.addEventListener('mousemove', e => {
        const rect = hero.getBoundingClientRect();
        const mx = (e.clientX - rect.left - rect.width  / 2) / rect.width;
        const my = (e.clientY - rect.top  - rect.height / 2) / rect.height;
        container.style.transform = `scale(1.06) translate(${mx * -10}px, ${my * -8}px)`;
      });
      hero.addEventListener('mouseleave', () => {
        container.style.transform = 'scale(1.06) translate(0,0)';
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Feed weather data in
  // ══════════════════════════════════════════════════════════════════════════
  function setWeather(weatherData, locationName) {
    if (!weatherData) return;
    const cw = weatherData.current_weather;

    state.temp      = Math.round(cw.temperature);
    state.windSpeed = Math.round(cw.windspeed);
    state.condition = typeof WMO_TEXT !== 'undefined' ? (WMO_TEXT[cw.weathercode] || 'Clear') : 'Clear';
    state.condIcon  = WMO_ICON[cw.weathercode] || '🌤️';
    state.location  = locationName || state.location;

    // Hourly extras
    if (weatherData.hourly) {
      const idx = new Date().getHours();
      state.humidity  = weatherData.hourly.relativehumidity_2m?.[idx] ?? '--';
      state.uvIndex   = weatherData.hourly.uv_index?.[idx] ?? '--';
    }

    // Daily forecast
    if (weatherData.daily) {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      state.forecast = (weatherData.daily.time || []).slice(0, 5).map((dateStr, i) => ({
        day:  days[new Date(dateStr).getDay()],
        icon: WMO_ICON[weatherData.daily.weathercode?.[i]] || '🌤️',
        hi:   Math.round(weatherData.daily.temperature_2m_max?.[i] ?? '--'),
        lo:   Math.round(weatherData.daily.temperature_2m_min?.[i] ?? '--'),
      }));
    }

    updateClimateStrip();
    updateSnapshotCard();
  }

  function setAQI(val, cat) {
    state.aqiVal = val;
    state.aqiCat = cat || aqiCategory(+val).cat;
    updateClimateStrip();
    updateSnapshotCard();
  }

  function setLocation(name, lat, lon) {
    state.location = name;
    if (lat !== undefined) state.lat = lat;
    if (lon !== undefined) state.lon = lon;
    updateClimateStrip();
    const pillLoc = document.getElementById('pill-location');
    if (pillLoc) pillLoc.textContent = name;
  }

  // NEW: CO₂ update
  function setCO2(val) {
    state.co2 = val;
    updateClimateStrip();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INIT — wires everything together
  // ══════════════════════════════════════════════════════════════════════════
  function init() {
    injectHeroHTML();

    requestAnimationFrame(() => {
      initAurora();
      applyTimeOfDay();
      initTypewriter();
      initCTARipple();
      initScrollTransition();

      setTimeout(initHeroMiniMap, 500);

      setTimeout(autoNotification, 5000);

      setInterval(applyTimeOfDay, 60 * 1000);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HTML INJECTION — builds the hero innerHTML (includes moving gradient + CO₂ chip)
  // ══════════════════════════════════════════════════════════════════════════
  function injectHeroHTML() {
    const hero = document.getElementById('hero');
    if (!hero || hero.dataset.upgraded) return;
    hero.dataset.upgraded = 'true';

    hero.innerHTML = `
      <canvas id="hero-aurora"></canvas>

      <!-- Slowly moving gradient background (alive feel) -->
      <div id="hero-gradient-bg"></div>

      <div id="hero-mini-map" style="
        position:absolute; inset:-5%; width:110%; height:110%;
        opacity:0.18; pointer-events:none; z-index:3;
        transition:transform 0.6s ease; transform:scale(1.06);
      "></div>

      <div class="hero-inner">

        <div class="hero-left">
          <div class="hero-location-pill">
            <span class="pill-dot"></span>
            <span id="hero-greeting">🌍 Live</span>
            &nbsp;·&nbsp;
            <span id="pill-location">${state.location}</span>
          </div>

          <div class="hero-climate-strip">
            <div class="climate-chip" id="chip-temp">
              🌡️ <span class="chip-val">--°C</span>
            </div>
            <div class="chip-divider"></div>
            <div class="climate-chip" id="chip-wind">
              💨 <span class="chip-val">-- km/h</span>
            </div>
            <div class="chip-divider"></div>
            <!-- CO₂ chip ADDED -->
            <div class="climate-chip" id="chip-co2">
              🌍 CO₂ <span class="chip-val">-- ppm</span>
            </div>
            <div class="chip-divider"></div>
            <div class="climate-chip" id="chip-aqi">
              🌫️ AQI <span class="chip-val">--</span>
            </div>
          </div>

          <h1 class="hero-headline">
            See what's happening to our planet<br>
            <span class="hl-accent">right now.</span>
          </h1>

          <div class="hero-typewriter-wrap">
            <span class="hero-typewriter">
              <span id="hero-typewriter-text"></span><span class="cursor"></span>
            </span>
          </div>

          <div class="hero-ctas">
            <a href="#dashboard" class="btn-hero-primary" onclick="document.getElementById('tracker')?.scrollIntoView({behavior:'smooth'});return false;">
              <i class="fas fa-tachometer-alt"></i>
              Open Dashboard
            </a>
            <a href="#map" class="btn-hero-secondary" onclick="document.getElementById('map-section')?.scrollIntoView({behavior:'smooth'});return false;">
              <i class="fas fa-map-marked-alt"></i>
              View Live Map
            </a>
          </div>

          <div class="hero-social-proof">
            <div class="proof-stat">
              <span class="ps-val" id="global-tree-count-hero">1,247</span>
              <span class="ps-label">Trees Tracked</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat">
              <span class="ps-val">Real-time</span>
              <span class="ps-label">Climate Data</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat">
              <span class="ps-val">Free</span>
              <span class="ps-label">Always Open</span>
            </div>
          </div>
        </div>

        <div class="hero-right">
          <div class="weather-snapshot-card">
            <div class="wsc-header">
              <span class="wsc-label">Live Conditions</span>
              <span class="wsc-live-badge">
                <span class="live-dot"></span>
                LIVE
              </span>
            </div>

            <div class="wsc-main">
              <div class="wsc-icon" id="wsc-icon">🌤️</div>
              <div class="wsc-temp-block">
                <div class="wsc-temp" id="wsc-temp">--<span class="deg">°C</span></div>
                <div class="wsc-condition" id="wsc-condition">Loading...</div>
              </div>
            </div>

            <div class="wsc-stats">
              <div class="wsc-stat">
                <span class="stat-icon">💨</span>
                <span class="stat-val" id="wsc-wind">-- km/h</span>
                <span class="stat-lbl">Wind</span>
              </div>
              <div class="wsc-stat">
                <span class="stat-icon">💧</span>
                <span class="stat-val" id="wsc-humidity">--%</span>
                <span class="stat-lbl">Humidity</span>
              </div>
              <div class="wsc-stat">
                <span class="stat-icon">☀️</span>
                <span class="stat-val" id="wsc-uv">--</span>
                <span class="stat-lbl">UV Index</span>
              </div>
            </div>

            <div class="wsc-aqi-section">
              <div class="wsc-aqi-top">
                <span class="aqi-label">Air Quality Index</span>
                <span class="aqi-val-badge" id="aqi-badge" style="color:#00E676">--</span>
              </div>
              <div class="aqi-bar-track">
                <div class="aqi-bar-fill" id="aqi-fill" style="width:0%"></div>
                <div class="aqi-bar-thumb" id="aqi-thumb" style="left:0%"></div>
              </div>
              <div class="aqi-category" id="aqi-cat-text">Fetching...</div>
            </div>

            <div class="wsc-forecast" id="wsc-forecast">
              ${['Mon','Tue','Wed','Thu','Fri'].map(d => `
                <div class="wsc-fc-day">
                  <span class="fc-day-name">${d}</span>
                  <span class="fc-day-icon">🌤️</span>
                  <span class="fc-day-temps"><span class="fc-hi">--°</span>/--°</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

      <div class="hero-scroll-indicator">
        <div class="scroll-mouse"><span class="scroll-dot"></span></div>
        <span class="scroll-label">Scroll</span>
      </div>
    `;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    setWeather,
    setAQI,
    setLocation,
    setCO2,
    showNotification,
  };
})();