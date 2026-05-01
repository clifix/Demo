// ═══════════════════════════════════════════════════════════════════
// CLIFIX UPGRADE.JS — ALL 9 PHASES
// Add <script src="upgrade.js"></script> BEFORE </body>, AFTER main.js
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
   * INTERNAL STATE
   * ───────────────────────────────────────────────────────────────── */
  const state = {
    currentCode: 0,
    isNight: false,
    soundEnabled: false,
    audioCtx: null,
    followMeInterval: null,
    notifEnabled: { rain: true, heat: true, wind: true, aqi: true, uv: true },
    notifHistory: [],
    miniCharts: {},
    weatherAtmosphere: null,
    lightningTimer: null,
  };

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 1: DYNAMIC WEATHER GRADIENTS
   * ───────────────────────────────────────────────────────────────── */
  const WX_CLASSES = ['wx-sunny','wx-cloudy','wx-rain','wx-storm','wx-snow','wx-fog','wx-night'];

  function codeToClass(code, isNight) {
    if (isNight) return 'wx-night';
    if ([0,1].includes(code))                      return 'wx-sunny';
    if ([2,3].includes(code))                      return 'wx-cloudy';
    if ([45,48].includes(code))                    return 'wx-fog';
    if ([71,73,75,77,85,86].includes(code))        return 'wx-snow';
    if ([95,96,99].includes(code))                 return 'wx-storm';
    if ([51,53,55,61,63,65,80,81,82].includes(code)) return 'wx-rain';
    return 'wx-cloudy';
  }

  function applyWeatherTheme(code, hourOfDay) {
    state.currentCode = code;
    state.isNight = (hourOfDay < 6 || hourOfDay >= 19);
    const cls = codeToClass(code, state.isNight);
    WX_CLASSES.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(cls);
    initWeatherAtmosphere(cls);
    if (state.isNight && cls === 'wx-night') startStarfield();
    else stopStarfield();
    if (cls === 'wx-storm') scheduleLightning();
    else stopLightning();
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 2: SMART LABELING + DEW POINT
   * ───────────────────────────────────────────────────────────────── */
  function smartHumidity(v) {
    if (v < 30) return `${v}% — Very Dry 🏜️`;
    if (v < 50) return `${v}% — Comfortable 😊`;
    if (v < 70) return `${v}% — Humid 💧`;
    return `${v}% — Very Humid 🌫️`;
  }

  function smartWind(kmh) {
    if (kmh < 10)  return `${kmh} km/h — Calm 🍃`;
    if (kmh < 30)  return `${kmh} km/h — Breezy 💨`;
    if (kmh < 60)  return `${kmh} km/h — Strong ⚠️`;
    return `${kmh} km/h — Dangerous 🚨`;
  }

  function smartPressure(hPa) {
    if (hPa < 980)  return `${hPa} hPa — Low Pressure 🌧️`;
    if (hPa < 1013) return `${hPa} hPa — Normal`;
    if (hPa < 1030) return `${hPa} hPa — High Pressure ☀️`;
    return `${hPa} hPa — Very High`;
  }

  function smartUV(uv) {
    if (uv < 3)  return `${uv.toFixed(1)} — Low ✅`;
    if (uv < 6)  return `${uv.toFixed(1)} — Moderate 🧴`;
    if (uv < 8)  return `${uv.toFixed(1)} — High ⚠️`;
    if (uv < 11) return `${uv.toFixed(1)} — Very High 🛑`;
    return `${uv.toFixed(1)} — Extreme ☢️`;
  }

  function calcDewPoint(tempC, humidity) {
    // Magnus formula
    const a = 17.27, b = 237.7;
    const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    return ((b * alpha) / (a - alpha)).toFixed(1);
  }

  function applySmartLabels(data) {
    const hourly = data.hourly;
    const daily  = data.daily;
    const cw     = data.current_weather;
    const hi     = new Date().getHours();

    const humidity = hourly.relativehumidity_2m?.[hi] || 0;
    const pressure = Math.round(hourly.surface_pressure?.[hi] || 0);
    const wind     = Math.round(cw.windspeed);
    const uv       = daily.uv_index_max?.[0] || 0;
    const temp     = Math.round(cw.temperature);
    const dew      = calcDewPoint(temp, humidity);
    const cloudCov = hourly.cloudcover?.[hi] || 0;

    setSmartEl('today-humidity',  smartHumidity(humidity));
    setSmartEl('today-wind',      smartWind(wind));
    setSmartEl('today-pressure',  smartPressure(pressure));
    setSmartEl('strip-uv',        smartUV(uv));

    const dewEl = document.getElementById('extra-dew');
    if (dewEl) dewEl.textContent = dew + '°C';

    const cloudEl = document.getElementById('extra-cloud');
    if (cloudEl) cloudEl.textContent = cloudCov + '% cloud cover';

    // Apply numeric counter animation
    animateCounters();
  }

  function setSmartEl(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.remove('counting');
    void el.offsetWidth;
    el.classList.add('counting');
  }

  function animateCounters() {
    document.querySelectorAll('.meta-val, .stat-pill-value, .current-temp').forEach(el => {
      el.classList.remove('counting');
      void el.offsetWidth;
      el.classList.add('counting');
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 3: MINI CHARTS
   * ───────────────────────────────────────────────────────────────── */
  const MINI_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    elements: { point: { radius: 0 } }
  };

  function initMiniCharts(data) {
    if (typeof Chart === 'undefined') return;
    const hourly = data.hourly;
    const hi = new Date().getHours();
    const slice = (arr) => (arr || []).slice(hi, hi + 24);

    // Temp curve
    createMiniChart('mini-temp-chart', 'line', {
      labels: Array.from({length:24}, (_,i)=>`${(hi+i)%24}h`),
      datasets: [{
        data: slice(hourly.temperature_2m).map(Math.round),
        borderColor: '#FF7043',
        backgroundColor: 'rgba(255,112,67,0.15)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }]
    });

    // Rain probability
    createMiniChart('mini-rain-chart', 'bar', {
      labels: Array.from({length:24}, (_,i)=>`${(hi+i)%24}h`),
      datasets: [{
        data: slice(hourly.precipitation_probability),
        backgroundColor: (ctx) => {
          const v = ctx.raw;
          return v > 70 ? 'rgba(66,165,245,0.8)'
               : v > 40 ? 'rgba(66,165,245,0.5)'
               : 'rgba(66,165,245,0.2)';
        },
        borderRadius: 3
      }]
    });

    // Wind speed trend
    createMiniChart('mini-wind-chart', 'line', {
      labels: Array.from({length:24}, (_,i)=>`${(hi+i)%24}h`),
      datasets: [{
        data: slice(hourly.windspeed_10m || hourly.temperature_2m),
        borderColor: '#26C6DA',
        backgroundColor: 'rgba(38,198,218,0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }]
    });
  }

  function createMiniChart(id, type, data) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.miniCharts[id]) { state.miniCharts[id].destroy(); }
    state.miniCharts[id] = new Chart(canvas.getContext('2d'), {
      type,
      data,
      options: { ...MINI_OPTS }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 4: SMART INSIGHTS ENGINE
   * ───────────────────────────────────────────────────────────────── */
  function computeSmartInsights(data) {
    const cw     = data.current_weather;
    const hourly = data.hourly;
    const daily  = data.daily;
    const hi     = new Date().getHours();
    const insights = [];

    const temp      = Math.round(cw.temperature);
    const feelsLike = Math.round(hourly.apparent_temperature?.[hi] || temp);
    const wind      = Math.round(cw.windspeed);
    const uv        = daily.uv_index_max?.[0] || 0;
    const humidity  = hourly.relativehumidity_2m?.[hi] || 0;
    const precip    = daily.precipitation_sum?.[0] || 0;

    // Rain in next 3 hours?
    const rainNext = (hourly.precipitation_probability || []).slice(hi, hi+3);
    const avgRainP = rainNext.reduce((a,b)=>a+b,0)/(rainNext.length||1);
    if (avgRainP > 60) insights.push({ icon:'fa-cloud-rain', text:`Heavy rain expected in the next 3 hours (${Math.round(avgRainP)}%)`, cls:'warn' });
    else if (avgRainP > 35) insights.push({ icon:'fa-cloud-showers-heavy', text:`Rain likely in the next 3 hours (${Math.round(avgRainP)}%)`, cls:'info' });

    // Feels hotter/colder?
    const diff = feelsLike - temp;
    if (diff >= 4)  insights.push({ icon:'fa-temperature-high', text:`Feels ${diff}°C hotter than actual — heat index effect`, cls:'danger' });
    if (diff <= -4) insights.push({ icon:'fa-temperature-low',  text:`Feels ${Math.abs(diff)}°C colder than actual — wind chill`, cls:'info' });

    // UV
    if (uv >= 10) insights.push({ icon:'fa-sun', text:`Extreme UV index ${uv.toFixed(0)} — stay indoors midday`, cls:'danger' });
    else if (uv >= 6) insights.push({ icon:'fa-sun', text:`High UV index ${uv.toFixed(0)} — wear SPF 50+`, cls:'warn' });

    // Wind
    if (wind >= 60) insights.push({ icon:'fa-wind', text:`Dangerous winds ${wind} km/h — avoid outdoor travel`, cls:'danger' });
    else if (wind >= 35) insights.push({ icon:'fa-wind', text:`Strong winds ${wind} km/h — secure loose objects`, cls:'warn' });

    // Humidity comfort
    if (humidity > 85) insights.push({ icon:'fa-tint', text:`Oppressive humidity ${humidity}% — limit outdoor activity`, cls:'warn' });
    else if (humidity < 25) insights.push({ icon:'fa-wind', text:`Very dry air ${humidity}% — stay hydrated`, cls:'info' });

    // Storm
    if ([95,96,99].includes(cw.weathercode)) {
      insights.push({ icon:'fa-bolt', text:`Active thunderstorm — seek shelter immediately`, cls:'danger' });
    }

    // All clear
    if (!insights.length) {
      insights.push({ icon:'fa-leaf', text:`Excellent eco conditions — great day outdoors`, cls:'good' });
      if (uv < 3) insights.push({ icon:'fa-sun', text:`Low UV today — no special sun protection needed`, cls:'good' });
    }

    renderInsights(insights);
    checkNotifications(insights, typeof aqiValue !== 'undefined' ? aqiValue : 0, uv);
  }

  function renderInsights(insights) {
    const row = document.getElementById('insight-chips-row');
    if (!row) return;
    row.innerHTML = insights.slice(0, 5).map((ins, i) =>
      `<div class="insight-chip-v2 ${ins.cls}" style="animation-delay:${i*0.07}s">
        <i class="fas ${ins.icon}"></i>
        <span>${ins.text}</span>
      </div>`
    ).join('');
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 5: FOLLOW ME MODE
   * ───────────────────────────────────────────────────────────────── */
  function initFollowMe() {
    const btn = document.getElementById('btn-follow-me');
    if (!btn) return;
    let active = false;
    btn.addEventListener('click', () => {
      active = !active;
      btn.classList.toggle('follow-me-active', active);
      btn.innerHTML = active
        ? '<i class="fas fa-location-arrow"></i> Following'
        : '<i class="fas fa-location-arrow"></i> Follow Me';
      if (active) {
        if (!navigator.geolocation) { btn.click(); return; }
        state.followMeInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(pos => {
            const { latitude: lat, longitude: lon } = pos.coords;
            if (typeof currentLat !== 'undefined') {
              window.currentLat = lat; window.currentLon = lon;
            }
            if (typeof map !== 'undefined' && map) map.setView([lat, lon], map.getZoom());
            if (typeof fetchWeather === 'function') {
              fetchWeather(lat, lon).then(d => {
                if (typeof updateWeatherUI === 'function') updateWeatherUI(d, 'Current Location');
              }).catch(()=>{});
            }
          }, ()=>{}, { enableHighAccuracy: true });
        }, 15000);
      } else {
        clearInterval(state.followMeInterval);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 6: ENHANCED ALERT SYSTEM
   * ───────────────────────────────────────────────────────────────── */
  function enhanceAlertBanner(severity, text) {
    const banner = document.getElementById('alert-banner');
    const bannerText = document.getElementById('alert-banner-text');
    if (!banner || !bannerText) return;

    banner.classList.remove('danger','warning','watch');
    if (severity === 'danger')  banner.classList.add('danger');
    if (severity === 'warning') banner.classList.add('warning');
    if (severity === 'watch')   banner.classList.add('watch');

    const levelMap = { danger:'🔴 DANGER', warning:'🟠 WARNING', watch:'🟡 WATCH' };
    const badge = `<span class="alert-level-badge ${severity}">${levelMap[severity]}</span>`;
    bannerText.innerHTML = badge + text;
    banner.classList.add('show');
  }

  // Patch the existing checkExtremeWeatherAlerts to use enhanced version
  const _origCheck = window.checkExtremeWeatherAlerts;
  window.checkExtremeWeatherAlerts = function(data) {
    if (typeof _origCheck === 'function') _origCheck(data);
    const cw = data.current_weather;
    const daily = data.daily;
    const maxRain = Math.max(...(daily.precipitation_sum || [0]));
    const maxUV = daily.uv_index_max?.[0] || 0;

    let severity = null, text = '';
    if ([95,96,99].includes(cw.weathercode)) { severity='danger'; text='Severe thunderstorm — seek shelter immediately.'; }
    else if (cw.temperature >= 38)           { severity='danger'; text=`Extreme heat ${Math.round(cw.temperature)}°C — stay hydrated.`; }
    else if (cw.windspeed >= 60)             { severity='warning'; text=`High winds ${Math.round(cw.windspeed)} km/h — avoid travel.`; }
    else if (maxRain >= 50)                  { severity='warning'; text=`Flood risk: ${maxRain.toFixed(0)}mm rain forecast.`; }
    else if (maxUV >= 10)                    { severity='watch';   text=`Extreme UV ${maxUV.toFixed(0)} — avoid midday sun.`; }

    if (severity) enhanceAlertBanner(severity, text);
  };

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 7: CLIMATE IMPACT TODAY
   * ───────────────────────────────────────────────────────────────── */
  async function loadClimateImpact(lat, lon) {
    const container = document.getElementById('climate-impact-grid');
    const noteEl    = document.getElementById('climate-impact-note-text');
    if (!container) return;

    try {
      // Fetch 30-year historical normals from open-meteo climate API
      const thisYear = new Date().getFullYear();
      const month    = String(new Date().getMonth()+1).padStart(2,'0');
      const day      = String(new Date().getDate()).padStart(2,'0');

      // Current data
      const curUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`
        + `&current_weather=true&timezone=auto&forecast_days=1`;
      const curRes  = await fetch(curUrl);
      const curData = await curRes.json();
      const curTemp  = Math.round(curData.current_weather.temperature);
      const curRain  = (curData.daily.precipitation_sum?.[0] || 0).toFixed(1);

      // Historical normals (past 30 days same date range)
      const histUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
        + `&start_date=${thisYear-1}-${month}-01&end_date=${thisYear-1}-${month}-${day}`
        + `&daily=temperature_2m_mean,precipitation_sum&timezone=auto`;
      const histRes  = await fetch(histUrl);
      const histData = await histRes.json();

      const histTemps = (histData.daily?.temperature_2m_mean || []).filter(v => v !== null);
      const histRain  = (histData.daily?.precipitation_sum   || []).filter(v => v !== null);
      const avgTemp   = histTemps.length ? (histTemps.reduce((a,b)=>a+b,0)/histTemps.length).toFixed(1) : null;
      const avgRain   = histRain.length  ? (histRain.reduce((a,b)=>a+b,0)/histRain.length).toFixed(1) : null;

      const tempDiff  = avgTemp ? (curTemp - parseFloat(avgTemp)).toFixed(1) : null;
      const rainDiff  = avgRain ? (parseFloat(curRain) - parseFloat(avgRain)).toFixed(1) : null;

      // AQI comparison (use current known value)
      const aqiNow = (typeof aqiValue !== 'undefined' ? aqiValue : null);

      container.innerHTML = buildImpactCard('🌡️', 'Temperature Today', curTemp+'°C',
        tempDiff, tempDiff > 0 ? 'above historical avg' : 'below historical avg',
        `Last year's daily average for this period was ~${avgTemp}°C.`,
        tempDiff > 1 ? 'above-normal' : tempDiff < -1 ? 'below-normal' : 'normal') +

        buildImpactCard('🌧️', 'Rainfall Today', curRain+'mm',
          rainDiff, rainDiff > 0 ? 'above seasonal norm' : 'below seasonal norm',
          `Historical daily average rainfall for this month: ~${avgRain}mm.`,
          rainDiff > 5 ? 'above-normal' : rainDiff < -2 ? 'below-normal' : 'normal') +

        (aqiNow
          ? buildImpactCard('🌬️', 'Air Quality Index', aqiNow,
              null, null,
              `AQI ${aqiNow < 50 ? 'is within healthy range today.' : aqiNow < 100 ? 'is moderate — sensitive groups should limit time outdoors.' : 'is elevated — reduce outdoor exposure.'}`,
              aqiNow < 50 ? 'normal' : aqiNow < 100 ? 'above-normal' : 'below-normal')
          : '');

      if (noteEl && tempDiff) {
        const sign = tempDiff > 0 ? '+' : '';
        noteEl.textContent = `Today's temperature is ${sign}${tempDiff}°C compared to the same period last year. Climate trends show consistent warming in this region.`;
      }
    } catch (e) {
      console.warn('Climate impact error:', e);
      if (container) container.innerHTML = `<p style="color:#8FAD8A;font-size:0.85rem;padding:20px;">Climate comparison data temporarily unavailable.</p>`;
    }
  }

  function buildImpactCard(emoji, label, value, delta, deltaLabel, desc, type) {
    const sign = delta > 0 ? '+' : '';
    const dCls = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral';
    return `<div class="climate-impact-card ${type}">
      <div class="impact-icon">${emoji}</div>
      <div class="impact-label">${label}</div>
      <div class="impact-value">${value}</div>
      ${delta !== null ? `<div class="impact-delta ${dCls}">${sign}${delta} ${deltaLabel || ''}</div>` : ''}
      <div class="impact-desc">${desc}</div>
    </div>`;
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 8: SMART NOTIFICATIONS
   * ───────────────────────────────────────────────────────────────── */
  let notifPanelOpen = false;

  function initNotificationsPanel() {
    const fab = document.getElementById('notif-fab');
    const panel = document.getElementById('notifications-panel');
    if (!fab || !panel) return;

    fab.addEventListener('click', () => {
      notifPanelOpen = !notifPanelOpen;
      panel.classList.toggle('open', notifPanelOpen);
    });

    document.getElementById('notif-panel-close')?.addEventListener('click', () => {
      notifPanelOpen = false;
      panel.classList.remove('open');
    });

    // Toggle switches
    ['rain','heat','wind','aqi','uv'].forEach(type => {
      const sw = document.getElementById(`notif-toggle-${type}`);
      if (sw) {
        sw.checked = state.notifEnabled[type];
        sw.addEventListener('change', () => { state.notifEnabled[type] = sw.checked; });
      }
    });

    // Request browser permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function checkNotifications(insights, aqi, uv) {
    insights.forEach(ins => {
      if (ins.cls === 'danger' || ins.cls === 'warn') {
        const type = ins.icon.includes('rain') ? 'rain'
          : ins.icon.includes('temperature') ? 'heat'
          : ins.icon.includes('wind') ? 'wind'
          : ins.icon.includes('sun') ? 'uv' : null;
        if (type && state.notifEnabled[type]) {
          addNotifHistory(type, ins.text);
          sendBrowserNotif('CliFix Alert', ins.text);
        }
      }
    });
    if (aqi > 150 && state.notifEnabled.aqi) {
      addNotifHistory('aqi', `AQI is ${aqi} — very unhealthy air quality`);
    }
  }

  function addNotifHistory(type, text) {
    const time = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    const iconMap = { rain:'fa-cloud-rain', heat:'fa-temperature-high', wind:'fa-wind', aqi:'fa-smog', uv:'fa-sun' };
    state.notifHistory.unshift({ type, text, time, icon: iconMap[type] || 'fa-bell' });
    state.notifHistory = state.notifHistory.slice(0, 10);
    renderNotifHistory();
    updateNotifBadge();
  }

  function renderNotifHistory() {
    const el = document.getElementById('notif-history');
    if (!el) return;
    if (!state.notifHistory.length) {
      el.innerHTML = '<div style="color:#8FAD8A;font-size:0.78rem;padding:8px 0;">No recent alerts</div>';
      return;
    }
    el.innerHTML = state.notifHistory.map(n =>
      `<div class="notif-item ${n.type}">
        <i class="fas ${n.icon}"></i>
        <div>
          <div>${n.text}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
      </div>`
    ).join('');
  }

  function updateNotifBadge() {
    const fab = document.getElementById('notif-fab');
    if (!fab) return;
    const count = state.notifHistory.filter(n => !n.read).length;
    if (count > 0) {
      fab.classList.add('has-badge');
      fab.setAttribute('data-count', count);
    } else {
      fab.classList.remove('has-badge');
    }
  }

  function sendBrowserNotif(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'favicon.ico' });
    }
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 9: WEATHER ATMOSPHERE ANIMATIONS
   * ───────────────────────────────────────────────────────────────── */
  let atmosphereCtx = null;
  let animationId = null;
  let particles = [];
  let starParticles = [];
  let starAnimId = null;

  function initWeatherAtmosphere(wxClass) {
    const canvas = document.getElementById('weather-atmosphere');
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    atmosphereCtx = canvas.getContext('2d');
    if (animationId) cancelAnimationFrame(animationId);
    particles = [];
    canvas.classList.remove('active');

    if (wxClass === 'wx-rain') {
      canvas.classList.add('active');
      spawnRain(200);
      animationId = requestAnimationFrame(drawRain);
    } else if (wxClass === 'wx-storm') {
      canvas.classList.add('active');
      spawnRain(350, true);
      animationId = requestAnimationFrame(drawRain);
    } else if (wxClass === 'wx-snow') {
      canvas.classList.add('active');
      spawnSnow(120);
      animationId = requestAnimationFrame(drawSnow);
    }
  }

  // Rain
  function spawnRain(count, heavy=false) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        len: heavy ? Math.random()*20+15 : Math.random()*12+8,
        speed: heavy ? Math.random()*12+10 : Math.random()*8+6,
        opacity: Math.random()*0.25+0.05
      });
    }
  }

  function drawRain() {
    const canvas = document.getElementById('weather-atmosphere');
    if (!canvas || !atmosphereCtx) return;
    atmosphereCtx.clearRect(0, 0, canvas.width, canvas.height);
    atmosphereCtx.strokeStyle = '#42A5F5';
    atmosphereCtx.lineWidth = 1;
    particles.forEach(p => {
      atmosphereCtx.globalAlpha = p.opacity;
      atmosphereCtx.beginPath();
      atmosphereCtx.moveTo(p.x, p.y);
      atmosphereCtx.lineTo(p.x - p.len * 0.2, p.y + p.len);
      atmosphereCtx.stroke();
      p.y += p.speed;
      p.x -= p.speed * 0.1;
      if (p.y > canvas.height) { p.y = -p.len; p.x = Math.random() * canvas.width; }
    });
    atmosphereCtx.globalAlpha = 1;
    animationId = requestAnimationFrame(drawRain);
  }

  // Snow
  function spawnSnow(count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random()*3+1,
        speed: Math.random()*1.5+0.5,
        dx: (Math.random()-0.5)*0.8,
        opacity: Math.random()*0.4+0.1
      });
    }
  }

  function drawSnow() {
    const canvas = document.getElementById('weather-atmosphere');
    if (!canvas || !atmosphereCtx) return;
    atmosphereCtx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      atmosphereCtx.globalAlpha = p.opacity;
      atmosphereCtx.fillStyle = '#E3F2FD';
      atmosphereCtx.beginPath();
      atmosphereCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      atmosphereCtx.fill();
      p.y += p.speed;
      p.x += p.dx;
      if (p.y > window.innerHeight) { p.y = -p.r; p.x = Math.random()*window.innerWidth; }
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
    });
    atmosphereCtx.globalAlpha = 1;
    animationId = requestAnimationFrame(drawSnow);
  }

  // Stars (night)
  function startStarfield() {
    const canvas = document.getElementById('weather-atmosphere');
    if (!canvas) return;
    canvas.classList.add('active');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    atmosphereCtx = canvas.getContext('2d');
    starParticles = Array.from({length:120}, () => ({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight*0.6,
      r: Math.random()*1.2+0.3,
      speed: Math.random()*0.008+0.003,
      phase: Math.random()*Math.PI*2
    }));
    function drawStars() {
      atmosphereCtx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() * 0.001;
      starParticles.forEach(s => {
        const alpha = 0.4 + 0.4*Math.sin(t*s.speed*10 + s.phase);
        atmosphereCtx.globalAlpha = alpha;
        atmosphereCtx.fillStyle = '#E8EAF6';
        atmosphereCtx.beginPath();
        atmosphereCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        atmosphereCtx.fill();
      });
      atmosphereCtx.globalAlpha = 1;
      starAnimId = requestAnimationFrame(drawStars);
    }
    if (starAnimId) cancelAnimationFrame(starAnimId);
    drawStars();
  }

  function stopStarfield() {
    if (starAnimId) { cancelAnimationFrame(starAnimId); starAnimId = null; }
    const canvas = document.getElementById('weather-atmosphere');
    if (canvas) canvas.classList.remove('active');
  }

  // Lightning
  function scheduleLightning() {
    const flash = document.getElementById('lightning-flash');
    if (!flash) return;
    function doFlash() {
      flash.classList.add('flash');
      setTimeout(() => flash.classList.remove('flash'), 300);
      playThunder();
      state.lightningTimer = setTimeout(doFlash, 5000 + Math.random()*12000);
    }
    state.lightningTimer = setTimeout(doFlash, 2000);
  }

  function stopLightning() {
    if (state.lightningTimer) { clearTimeout(state.lightningTimer); state.lightningTimer = null; }
  }

  /* ─────────────────────────────────────────────────────────────────
   * PHASE 9: SOUND (optional)
   * ───────────────────────────────────────────────────────────────── */
  function initAudioCtx() {
    if (!state.audioCtx) {
      try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
  }

  function playThunder() {
    if (!state.soundEnabled) return;
    initAudioCtx();
    if (!state.audioCtx) return;
    const buf = state.audioCtx.createBuffer(1, state.audioCtx.sampleRate*1.5, state.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2) * 0.3;
    }
    const src = state.audioCtx.createBufferSource();
    const gain = state.audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime+1.5);
    src.buffer = buf;
    src.connect(gain); gain.connect(state.audioCtx.destination);
    src.start();
  }

  function initSoundToggle() {
    const btn = document.getElementById('sound-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      btn.classList.toggle('active', state.soundEnabled);
      btn.title = state.soundEnabled ? 'Sound ON' : 'Sound OFF';
      btn.innerHTML = state.soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
      if (state.soundEnabled) {
        initAudioCtx();
        if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────
   * INTEGRATION — HOOK INTO updateWeatherUI
   * ───────────────────────────────────────────────────────────────── */
  const _origUpdateWeatherUI = window.updateWeatherUI;
  window.updateWeatherUI = function(data, locationName) {
    if (typeof _origUpdateWeatherUI === 'function') _origUpdateWeatherUI(data, locationName);

    const hour = new Date().getHours();
    applyWeatherTheme(data.current_weather.weathercode, hour);
    applySmartLabels(data);
    initMiniCharts(data);
    computeSmartInsights(data);

    // Trigger Climate Impact update
    if (typeof currentLat !== 'undefined' && currentLat) {
      loadClimateImpact(currentLat, currentLon).catch(()=>{});
    }
  };

  /* ─────────────────────────────────────────────────────────────────
   * BOOT
   * ───────────────────────────────────────────────────────────────── */
  function boot() {
    initFollowMe();
    initNotificationsPanel();
    initSoundToggle();

    window.addEventListener('resize', () => {
      const canvas = document.getElementById('weather-atmosphere');
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();