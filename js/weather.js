// ═══════════════════════════════════════════════════════
// WEATHER & AQI FUNCTIONS + MAP & HERO ANIMATION INTEGRATION
// ═══════════════════════════════════════════════════════

function getEmoji(code) { return WMO_EMOJI[code] || '🌤️'; }
function getText(code) { return WMO_TEXT[code] || 'Unknown'; }

async function geocode(city) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const d = await r.json();
  if (!d.results?.length) throw new Error('City not found');
  return { lat: d.results[0].latitude, lon: d.results[0].longitude, name: d.results[0].name + ', ' + (d.results[0].country || '') };
}

async function reverseGeocode(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: { 'Accept-Language': 'en' } });
    const d = await r.json();
    const parts = [d.address?.city || d.address?.town || d.address?.village, d.address?.state, d.address?.country].filter(Boolean);
    return parts.join(', ') || 'Unknown location';
  } catch(e) { return 'Unknown location'; }
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,weathercode,precipitation_probability,relativehumidity_2m,apparent_temperature,visibility,surface_pressure,uv_index` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,windspeed_10m_max` +
    `&current_weather=true&temperature_unit=celsius&timezone=auto&forecast_days=7`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Weather API failed');
  return r.json();
}

function updateWeatherUI(data, locationName) {
  currentWeatherData = data;
  const cw = data.current_weather;
  const daily = data.daily;
  const hourly = data.hourly;
  const now = new Date();
  const hi = now.getHours();

  // Main card
  document.getElementById('today-emoji').textContent = getEmoji(cw.weathercode);
  document.getElementById('today-temp').textContent = Math.round(cw.temperature) + '°C';
  document.getElementById('today-condition').textContent = getText(cw.weathercode);
  document.getElementById('today-max').textContent = '↑ ' + Math.round(daily.temperature_2m_max[0]) + '°C';
  document.getElementById('today-min').textContent = '↓ ' + Math.round(daily.temperature_2m_min[0]) + '°C';
  document.getElementById('today-wind').textContent = Math.round(cw.windspeed) + ' km/h';
  document.getElementById('today-humidity').textContent = (hourly.relativehumidity_2m?.[hi] || '--') + '%';
  document.getElementById('today-visibility').textContent = Math.round((hourly.visibility?.[hi] || 0) / 1000) + ' km';
  document.getElementById('today-pressure').textContent = Math.round(hourly.surface_pressure?.[hi] || 0) + ' hPa';

  // Stat strip
  document.getElementById('strip-feelslike').textContent = Math.round(hourly.apparent_temperature?.[hi] || cw.temperature) + '°C';
  const uv = daily.uv_index_max?.[0] || 0;
  document.getElementById('strip-uv').textContent = uv.toFixed(1);
  document.getElementById('strip-uv-label').textContent = uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : uv < 8 ? 'High' : 'Very High';
  const precip = daily.precipitation_sum?.[0] || 0;
  document.getElementById('strip-precip').textContent = (hourly.precipitation_probability?.[hi] || 0) + '%';

  // Eco Score
  const windScore = Math.min(cw.windspeed / 30, 1);
  const uvPenalty = uv > 8 ? 0.7 : 1;
  const precipBonus = precip > 0 ? 1.05 : 1;
  const ecoVal = Math.round(90 * uvPenalty * precipBonus - windScore * 10);
  const ecoScore = Math.max(40, Math.min(100, ecoVal));
  document.getElementById('strip-eco').textContent = ecoScore >= 85 ? 'A+' : ecoScore >= 75 ? 'A' : ecoScore >= 65 ? 'B' : ecoScore >= 55 ? 'C' : 'D';
  document.getElementById('strip-eco-label').textContent = ecoScore >= 85 ? 'Excellent eco day' : ecoScore >= 65 ? 'Good eco day' : 'High impact day';

  // Hourly forecast
  const hourlyEl = document.getElementById('hourly-scroll');
  hourlyEl.innerHTML = '';
  for (let i = hi; i < hi + 24; i++) {
    const idx = i % 24;
    const div = document.createElement('div');
    div.className = 'hourly-item';
    div.innerHTML = `<div class="hourly-time">${String(idx).padStart(2, '0')}:00</div><span class="hourly-emoji">${getEmoji(hourly.weathercode?.[i] || 0)}</span><div class="hourly-temp">${Math.round(hourly.temperature_2m?.[i] || 0)}°</div>`;
    hourlyEl.appendChild(div);
  }

  // 7-day forecast
  const weeklyEl = document.getElementById('weekly-list');
  weeklyEl.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const div = document.createElement('div');
    div.className = 'day-item';
    div.innerHTML = `<span class="day-name">${dayName}</span><span class="day-emoji">${getEmoji(daily.weathercode[i])}</span><span class="day-temp-range"><span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span><span style="color:var(--text-muted)">·</span><span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span></span>`;
    weeklyEl.appendChild(div);
  }

  fetchAndUpdateClimateCharts(currentLat, currentLon);
  updateEcoTipsForWeather(cw.weathercode);
  checkExtremeWeatherAlerts(data);
  if (typeof refreshAIInsights === 'function') refreshAIInsights();

  // ── MAP ANIMATION: Send weather data ──
  if (typeof ClifixMapAnim !== 'undefined' && window.updateMapWeatherAnimation) {
    window.updateMapWeatherAnimation(data);
  }
}

function checkExtremeWeatherAlerts(data) {
  const alerts = [];
  const cw = data.current_weather;
  const daily = data.daily;

  if ([82, 95, 96, 99].includes(cw.weathercode)) alerts.push('⛈️ Severe thunderstorm detected in your area. Seek shelter immediately.');
  if (cw.temperature >= 38) alerts.push(`🌡️ Extreme heat warning: ${Math.round(cw.temperature)}°C. Stay hydrated and avoid outdoor activity.`);
  if (cw.temperature <= -5) alerts.push(`❄️ Freeze warning: ${Math.round(cw.temperature)}°C. Protect pipes and dress in layers.`);
  if (cw.windspeed >= 60) alerts.push(`💨 High wind alert: ${Math.round(cw.windspeed)} km/h. Avoid driving and secure outdoor objects.`);
  const maxRain = Math.max(...(daily.precipitation_sum || [0]));
  if (maxRain >= 50) alerts.push(`🌊 Flood risk: ${maxRain.toFixed(0)}mm of rain forecast. Avoid low-lying areas.`);
  const maxUV = daily.uv_index_max?.[0] || 0;
  if (maxUV >= 10) alerts.push(`☀️ Extreme UV warning: Index ${maxUV.toFixed(0)}. Wear SPF 50+ and avoid midday sun.`);

  const banner = document.getElementById('alert-banner');
  const bannerText = document.getElementById('alert-banner-text');
  if (alerts.length > 0) {
    bannerText.textContent = alerts[0];
    banner.classList.add('show');
  } else {
    banner.classList.remove('show');
  }
}

// ── ENHANCED AQI ------------------------------------------------------
function getAQICategory(aqi) {
  if (aqi <= 50)  return { label: 'Good',        cls: 'good', color: '#00E676', advice: 'Air quality is satisfactory. Perfect for all outdoor activities.' };
  if (aqi <= 100) return { label: 'Moderate',    cls: 'moderate', color: '#FFB300', advice: 'Air quality is acceptable. Sensitive groups should limit prolonged outdoor exertion.' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', cls: 'poor', color: '#FF9800', advice: 'Sensitive groups may experience health effects. General public is unlikely to be affected.' };
  if (aqi <= 200) return { label: 'Unhealthy',   cls: 'poor', color: '#F44336', advice: 'Everyone may experience health effects. Sensitive groups should avoid outdoor exertion.' };
  if (aqi <= 300) return { label: 'Very Unhealthy', cls: 'poor', color: '#9C27B0', advice: 'Health alert! Everyone should avoid prolonged outdoor exertion.' };
  return           { label: 'Hazardous',          cls: 'poor', color: '#7B1FA2', advice: '⚠️ Emergency conditions. Avoid all outdoor activity.' };
}

function getPollutantStatus(value, type) {
  const thresholds = {
    pm2_5:  [{ limit: 12,  label: 'Good',         color: '#00E676' },
             { limit: 35,  label: 'Moderate',     color: '#FFB300' },
             { limit: 55,  label: 'Unhealthy',    color: '#FF5252' },
             { limit: 150, label: 'Very Unhealthy', color: '#9C27B0' },
             { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }],
    pm10:   [{ limit: 50,  label: 'Good',         color: '#00E676' },
             { limit: 150, label: 'Moderate',     color: '#FFB300' },
             { limit: 250, label: 'Unhealthy',    color: '#FF5252' },
             { limit: 350, label: 'Very Unhealthy', color: '#9C27B0' },
             { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }],
    no2:    [{ limit: 40,  label: 'Good',         color: '#00E676' },
             { limit: 200, label: 'Moderate',     color: '#FFB300' },
             { limit: 400, label: 'Unhealthy',    color: '#FF5252' },
             { limit: Infinity, label: 'Very Unhealthy', color: '#9C27B0' }],
    o3:     [{ limit: 50,  label: 'Good',         color: '#00E676' },
             { limit: 100, label: 'Moderate',     color: '#FFB300' },
             { limit: 168, label: 'Unhealthy',    color: '#FF5252' },
             { limit: 208, label: 'Very Unhealthy', color: '#9C27B0' },
             { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }]
  };
  const scale = thresholds[type] || thresholds.pm2_5;
  for (const t of scale) {
    if (value <= t.limit) return { label: t.label, color: t.color };
  }
}

function getHealthImpact(aqi, pollutants) {
  const advice = {
    children: 'No restrictions.',
    asthma: 'No restrictions.',
    activity: 'Ideal for outdoor exercise.',
  };
  if (aqi > 100) {
    advice.children = 'Reduce prolonged outdoor play.';
    advice.asthma = 'Limit outdoor exertion, keep inhaler nearby.';
    advice.activity = 'Consider indoor activities for sensitive groups.';
  }
  if (aqi > 150) {
    advice.children = 'Avoid outdoor play.';
    advice.asthma = 'Avoid outdoor activities, keep windows closed.';
    advice.activity = 'Avoid strenuous outdoor exercise.';
  }
  if (aqi > 200) {
    advice.children = 'Stay indoors.';
    advice.asthma = 'Stay indoors with air purifier, seek medical help if breathing difficulty occurs.';
    advice.activity = 'Avoid all outdoor activity.';
  }
  if (pollutants.pm2_5 > 35) {
    advice.asthma = 'PM2.5 high — risk of asthma attacks. Minimize outdoor exposure.';
  }
  if (pollutants.o3 > 100) {
    advice.children = 'Ozone levels high — avoid midday outdoor activities.';
    advice.activity = 'Ozone may reduce lung function — avoid heavy exertion.';
  }
  return advice;
}

function getDominantPollutant(pollutants) {
  const weights = { pm2_5: 100, pm10: 70, no2: 80, o3: 90 };
  let max = 0, dominant = 'PM2.5';
  for (const [key, val] of Object.entries(pollutants)) {
    const weighted = val * (weights[key] || 1);
    if (weighted > max) { max = weighted; dominant = key.toUpperCase(); }
  }
  return dominant;
}

async function fetchAQI(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&hourly=european_aqi&forecast_days=1`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.current) throw new Error('No AQI data');
    currentAQIData = d;

    const aqi = Math.round(d.current.european_aqi || 0);
    const cat = getAQICategory(aqi);

    document.getElementById('aqi-value').textContent = aqi;
    document.getElementById('aqi-value').style.color = cat.color;
    const catEl = document.getElementById('aqi-category');
    catEl.textContent = cat.label;
    catEl.className = 'aqi-label ' + cat.cls;
    document.getElementById('aqi-advice').textContent = cat.advice;

    const pm25 = parseFloat(d.current.pm2_5) || 0;
    const pm10 = parseFloat(d.current.pm10) || 0;
    const no2  = parseFloat(d.current.nitrogen_dioxide) || 0;
    const o3   = parseFloat(d.current.ozone) || 0;
    const pollutants = { pm2_5: pm25, pm10: pm10, no2: no2, o3: o3 };

    const dominant = getDominantPollutant(pollutants);
    document.getElementById('dominant-text').textContent = `Dominant: ${dominant} · ${getPollutantStatus(pm25, 'pm2_5').label}`;

    const health = getHealthImpact(aqi, pollutants);
    document.getElementById('health-children').innerHTML = `<i class="fas fa-child"></i> Children: ${health.children}`;
    document.getElementById('health-asthma').innerHTML = `<i class="fas fa-lungs"></i> Asthma: ${health.asthma}`;
    document.getElementById('health-activity').innerHTML = `<i class="fas fa-running"></i> Activity: ${health.activity}`;

    function setPollutantRow(value, type, levelId, statusId) {
      const status = getPollutantStatus(value, type);
      document.getElementById(levelId).textContent = value.toFixed(1);
      const statusEl = document.getElementById(statusId);
      statusEl.textContent = status.label;
      statusEl.style.color = status.color;
    }
    setPollutantRow(pm25, 'pm2_5', 'pm25-level', 'pm25-status');
    setPollutantRow(pm10, 'pm10', 'pm10-level', 'pm10-status');
    setPollutantRow(no2,  'no2',  'no2-level',  'no2-status');
    setPollutantRow(o3,   'o3',   'o3-level',   'o3-status');

    drawAQIGauge(aqi, cat.color);
    drawAQITrend(d.hourly?.european_aqi?.slice(0, 24) || []);

    if (typeof ClifixMapAnim !== 'undefined' && window.updateMapAQIAnimation) {
      window.updateMapAQIAnimation(aqi);
    }

    if (typeof ClifixHero !== 'undefined' && ClifixHero.setAQI) {
      ClifixHero.setAQI(aqi, cat.label);
    }

    checkPersonalAlerts(aqi, cat.label);
    if (typeof refreshAIInsights === 'function') refreshAIInsights();

    if (aqi > 80) {
      const banner = document.getElementById('alert-banner');
      const bannerText = document.getElementById('alert-banner-text');
      if (!banner.classList.contains('show')) {
        bannerText.textContent = `⚠️ Air quality is ${cat.label} (AQI ${aqi}). ${cat.advice}`;
        banner.classList.add('show');
      }
    }
  } catch (e) {
    console.warn('AQI error', e);
    document.getElementById('aqi-value').textContent = '--';
    document.getElementById('aqi-category').textContent = 'Unavailable';
    document.getElementById('aqi-advice').textContent = 'Unable to fetch air quality data.';
  }
}

function checkPersonalAlerts(aqi, label) {
  const enabled = localStorage.getItem('aqi_alert_enabled') === 'true';
  if (!enabled) return;
  const threshold = parseInt(localStorage.getItem('aqi_alert_threshold') || '100');
  if (aqi >= threshold && Notification.permission === 'granted') {
    new Notification('🌫️ AQI Alert', { body: `Current AQI: ${aqi} (${label}). Follow health recommendations.` });
  }
}

function initAQIAlerts() {
  const enableBtn = document.getElementById('enable-aqi-alerts');
  const disableBtn = document.getElementById('disable-aqi-alerts');
  const thresholdInput = document.getElementById('alert-threshold');
  const statusEl = document.getElementById('alert-status');

  function updateStatus() {
    const enabled = localStorage.getItem('aqi_alert_enabled') === 'true';
    const threshold = localStorage.getItem('aqi_alert_threshold') || '100';
    thresholdInput.value = threshold;
    statusEl.textContent = enabled ? `Alerts active (threshold ${threshold}).` : 'Alerts disabled.';
  }

  enableBtn.addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          localStorage.setItem('aqi_alert_enabled', 'true');
          localStorage.setItem('aqi_alert_threshold', thresholdInput.value);
          updateStatus();
        } else {
          alert('Please allow notifications for AQI alerts.');
        }
      });
    } else {
      localStorage.setItem('aqi_alert_enabled', 'true');
      localStorage.setItem('aqi_alert_threshold', thresholdInput.value);
      updateStatus();
    }
  });

  disableBtn.addEventListener('click', () => {
    localStorage.setItem('aqi_alert_enabled', 'false');
    updateStatus();
  });

  updateStatus();
}

window.requestAIExplanation = async function() {
  const explainEl = document.getElementById('ai-explain-text');
  const btn = document.getElementById('ai-explain-btn');
  if (!explainEl || !btn) return;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  explainEl.textContent = 'Analyzing local air quality data...';

  let prompt = "You are CliFix AI. Explain the current air quality in simple terms: ";
  if (currentAQIData) {
    const aqi = Math.round(currentAQIData.current.european_aqi || 0);
    const pm25 = currentAQIData.current.pm2_5 != null ? currentAQIData.current.pm2_5.toFixed(1) : '?';
    const pm10 = currentAQIData.current.pm10 != null ? currentAQIData.current.pm10.toFixed(1) : '?';
    const no2  = currentAQIData.current.nitrogen_dioxide != null ? currentAQIData.current.nitrogen_dioxide.toFixed(1) : '?';
    const o3   = currentAQIData.current.ozone != null ? currentAQIData.current.ozone.toFixed(1) : '?';
    prompt += `AQI: ${aqi}, PM2.5: ${pm25} µg/m³, PM10: ${pm10} µg/m³, NO2: ${no2} µg/m³, O3: ${o3} µg/m³. `;
  }
  prompt += "Include pollution sources (if possible), who is most at risk, and one practical tip. Keep it under 3 sentences.";

  try {
    let explanation = '';
    if (typeof window.callAIForText === 'function') {
      explanation = await window.callAIForText(prompt);
    } else {
      const aqi = Math.round(currentAQIData?.current?.european_aqi || 0);
      explanation = `Current AQI is ${aqi} (${getAQICategory(aqi).label}). ${getAQICategory(aqi).advice}`;
    }
    explainEl.textContent = explanation;
  } catch (e) {
    explainEl.textContent = 'Could not generate explanation. Check your connection.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Explain';
  }
};

function drawAQIGauge(aqi, color) {
  const canvas = document.getElementById('aqiGauge');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2 + 10, r = 70;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const start = Math.PI * 0.8, end = Math.PI * 2.2;
  ctx.beginPath(); ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
  const fillAngle = start + (end - start) * (Math.min(aqi, 150) / 150);
  ctx.beginPath(); ctx.arc(cx, cy, r, start, fillAngle);
  ctx.strokeStyle = color; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = '#E8F5E1'; ctx.font = 'bold 28px Syne,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(aqi, cx, cy - 4);
  ctx.fillStyle = '#8FAD8A'; ctx.font = '12px Outfit,sans-serif';
  ctx.fillText('AQI', cx, cy + 22);
}

function drawAQITrend(data) {
  const canvas = document.getElementById('aqiTrendChart');
  if (!canvas || !data.length) return;
  const ctx = canvas.getContext('2d');
  const labels = data.map((_, i) => `${i}h`);
  if (window._aqiTrendChart) window._aqiTrendChart.destroy();
  window._aqiTrendChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'AQI', data, borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.07)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10,30,15,0.95)', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A', maxTicksLimit: 5 } }, x: { grid: { display: false }, ticks: { color: '#8FAD8A', maxTicksLimit: 8 } } } }
  });
}

// Climate Charts
function initCharts() {
  const tctx = document.getElementById('tempChart')?.getContext('2d');
  if (tctx && !tempChart) {
    tempChart = new Chart(tctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Avg Temp (°C)', data: [], borderColor: '#FF7043', backgroundColor: 'rgba(255,112,67,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#FF7043', pointBorderColor: '#0D1A0F', pointRadius: 4, borderWidth: 2 }] },
      options: { responsive: true, scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A' } }, x: { grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A' } } }, plugins: { legend: { labels: { color: '#8FAD8A' } }, tooltip: { backgroundColor: 'rgba(10,30,15,0.95)', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 } } }
    });
  }
  const cctx = document.getElementById('co2Chart')?.getContext('2d');
  if (cctx && !co2Chart) {
    co2Chart = new Chart(cctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'CO₂ (ppm)', data: [], borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.07)', fill: true, tension: 0.4, pointBackgroundColor: '#00E676', pointBorderColor: '#0D1A0F', pointRadius: 3, borderWidth: 2 }] },
      options: { responsive: true, scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A' } }, x: { grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A', maxRotation: 45, maxTicksLimit: 8 } } }, plugins: { legend: { labels: { color: '#8FAD8A' } }, tooltip: { backgroundColor: 'rgba(10,30,15,0.95)', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 } } }
    });
  }
}

async function fetchAndUpdateClimateCharts(lat, lon) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean&timezone=auto&forecast_days=7`);
    const d = await r.json();
    if (d.daily && tempChart) {
      const labels = d.daily.time.map((t, i) => i === 0 ? 'Today' : new Date(t).toLocaleDateString('en-US', { weekday: 'short' }));
      tempChart.data.labels = labels;
      tempChart.data.datasets[0].data = d.daily.temperature_2m_mean.map(v => parseFloat(v.toFixed(1)));
      tempChart.update();
      const avg = (d.daily.temperature_2m_mean.reduce((a, b) => a + b, 0) / d.daily.temperature_2m_mean.length).toFixed(1);
      const min = Math.min(...d.daily.temperature_2m_mean).toFixed(1);
      const max = Math.max(...d.daily.temperature_2m_mean).toFixed(1);
      document.getElementById('temp-change-summary').textContent = `7-day avg: ${avg}°C · Range: ${min}°C – ${max}°C`;
    }
  } catch (e) { console.warn('Climate chart error', e); }
}

// ─────────────────────────────────────────────────────
// UPDATED fetchCO2 – now always updates the hero
// ─────────────────────────────────────────────────────
async function fetchCO2() {
  try {
    const r = await fetch('https://global-warming.org/api/co2-api');
    const d = await r.json();

    // Update the old CO₂ chart if it exists
    if (d?.co2?.length > 0 && co2Chart) {
      const sorted = d.co2.sort((a, b) => new Date(`${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`) - new Date(`${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`));
      const recent = sorted.slice(-30);
      co2Chart.data.labels = recent.map(e => `${e.month}/${e.day}`);
      co2Chart.data.datasets[0].data = recent.map(e => parseFloat(e.cycle));
      co2Chart.update();
    }

    // Always send the latest CO₂ value to the hero, regardless of chart
    if (d?.co2?.length > 0) {
      const sorted = d.co2.sort((a, b) => new Date(`${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`) - new Date(`${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`));
      const latest = sorted[sorted.length - 1];
      const val = parseFloat(latest.cycle).toFixed(2);
      document.getElementById('co2-level').textContent = `Current: ${val} ppm`;

      if (typeof ClifixHero !== 'undefined' && ClifixHero.setCO2) {
        ClifixHero.setCO2(parseFloat(val).toFixed(0));
      }
    }
  } catch (e) {
    // Fallback values when API fails
    if (co2Chart) {
      const labels = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); return `${d.getMonth() + 1}/${d.getDate()}`; });
      const base = 424.2;
      co2Chart.data.labels = labels;
      co2Chart.data.datasets[0].data = labels.map((_, i) => +(base + Math.sin(i * 0.3) * 0.8 + i * 0.04).toFixed(2));
      co2Chart.update();
    }
    document.getElementById('co2-level').textContent = 'Current: ~424.6 ppm (estimated)';

    // Always push fallback to hero
    if (typeof ClifixHero !== 'undefined' && ClifixHero.setCO2) {
      ClifixHero.setCO2('424');
    }
  }
}

// Eco Tips based on weather
const ecoTipsList = [
  "Bring your own bag when shopping to reduce plastic use.",
  "Use public transport or bike to reduce your carbon footprint.",
  "Switch off lights when not in use to save energy.",
  "Avoid fast fashion — buy sustainable, durable clothing.",
  "Compost your kitchen waste to reduce landfill methane.",
  "Plant native species in your garden to support biodiversity.",
  "Reduce meat consumption — even 1 plant-based day per week makes a difference.",
  "Install a smart thermostat and save up to 15% on heating bills.",
  "Choose renewable energy tariffs for your home.",
  "Repair electronics instead of replacing them to cut e-waste.",
];

const weatherTipMap = {
  sunny: "With clear skies today, line-dry your clothes and charge solar devices!",
  rainy: "It's raining — collect rainwater for your garden and skip watering duties.",
  cloudy: "Cloudy day — perfect time for indoor energy audits and switching to LEDs.",
  windy: "Windy day! Check your home for drafts and seal them to reduce heating costs.",
  snow: "Stay warm efficiently — layer clothing before cranking the thermostat.",
  storm: "Severe weather — stay safe indoors and prep an emergency kit.",
};

const products = ["Reusable Eco-bag", "Bamboo Toothbrush", "Stainless Steel Straw", "Solar Power Bank", "Compost Bin", "Beeswax Wraps", "Reusable Coffee Cup", "Bamboo Utensils", "Eco Laundry Strips", "Tote Bag Set"];

function updateEcoTipsForWeather(weatherCode) {
  const tipEl = document.getElementById('daily-tip');
  const wtipEl = document.getElementById('weather-tip');
  const prodEl = document.getElementById('product-scroll');

  if (tipEl) tipEl.textContent = ecoTipsList[Math.floor(Math.random() * ecoTipsList.length)];

  let wtip = weatherTipMap.cloudy;
  if ([0, 1].includes(weatherCode)) wtip = weatherTipMap.sunny;
  else if ([80, 81, 82, 51, 53, 55, 61, 63, 65].includes(weatherCode)) wtip = weatherTipMap.rainy;
  else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) wtip = weatherTipMap.snow;
  else if ([95, 96, 99].includes(weatherCode)) wtip = weatherTipMap.storm;
  else if (weatherCode === 3) wtip = weatherTipMap.cloudy;
  if (wtipEl) wtipEl.textContent = wtip;

  if (prodEl) {
    prodEl.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'product-chip';
      div.textContent = p;
      prodEl.appendChild(div);
    });
  }
}