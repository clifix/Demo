/**
 * CliFix Weather Module — weather.js v2.1.0
 *
 * Responsibilities:
 *  - Detect user location (Geolocation API → IP fallback)
 *  - Fetch current weather + 7-day forecast from Open-Meteo
 *  - Update all weather DOM elements
 *  - Expose weather context to CliFix_AI
 *  - Render optimized Chart.js charts
 *  - Prevent memory leaks + race conditions
 *
 * FIXES IMPLEMENTED:
 *  ✅ Prevent overlapping init() calls
 *  ✅ Added fetch timeout support
 *  ✅ Added safer API handling
 *  ✅ Reduced reverse geocode spam
 *  ✅ Fixed visibility bug
 *  ✅ Prevent Chart.js listener stacking
 *  ✅ Better mobile optimization
 *  ✅ Better low-end Android stability
 *  ✅ Background-tab refresh optimization
 */

'use strict';

(function CliFix_Weather() {

  /* ──────────────────────────────────────────
     API CONFIG
  ────────────────────────────────────────── */
  const API = {
    GEO:    'https://api.open-meteo.com/v1/forecast',
    IP_GEO: 'https://ipapi.co/json/',
  };

  /* ──────────────────────────────────────────
     WEATHER CODES
  ────────────────────────────────────────── */
  const WMO = {
    0:'Clear sky',
    1:'Mainly clear',
    2:'Partly cloudy',
    3:'Overcast',
    45:'Fog',
    48:'Icing fog',
    51:'Light drizzle',
    53:'Drizzle',
    55:'Heavy drizzle',
    61:'Light rain',
    63:'Rain',
    65:'Heavy rain',
    71:'Light snow',
    73:'Snow',
    75:'Heavy snow',
    80:'Light showers',
    81:'Showers',
    82:'Violent showers',
    85:'Snow showers',
    86:'Heavy snow showers',
    95:'Thunderstorm',
    96:'Thunderstorm + hail',
    99:'Thunderstorm + heavy hail',
  };

  const WMO_ICON = {
    0:'☀️',
    1:'🌤️',
    2:'⛅',
    3:'☁️',
    45:'🌫️',
    48:'🌫️',
    51:'🌦️',
    53:'🌧️',
    55:'🌧️',
    61:'🌦️',
    63:'🌧️',
    65:'🌧️',
    71:'🌨️',
    73:'❄️',
    75:'❄️',
    80:'🌦️',
    81:'🌧️',
    82:'⛈️',
    85:'❄️',
    86:'❄️',
    95:'⛈️',
    96:'⛈️',
    99:'⛈️',
  };

  /* ──────────────────────────────────────────
     STATE
  ────────────────────────────────────────── */
  const state = {
    lat: null,
    lon: null,
    city: null,
    weather: null,
    charts: {},
    isLoading: false,
    waitingForChart: false,
  };

  /* ──────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────── */
  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value ?? '--';
  }

  function setHTML(id, value) {
    const el = $(id);
    if (el) el.innerHTML = value ?? '';
  }

  function formatTime(iso) {
    if (!iso) return '';

    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return '';
    }
  }

  function formatDay(iso) {
    if (!iso) return '';

    try {
      return new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  function uviLabel(uvi) {

    if (uvi == null) {
      return { label: '–', cls: '' };
    }

    if (uvi <= 2) {
      return { label: 'Low', cls: 'uvi-low' };
    }

    if (uvi <= 5) {
      return { label: 'Moderate', cls: 'uvi-moderate' };
    }

    if (uvi <= 7) {
      return { label: 'High', cls: 'uvi-high' };
    }

    if (uvi <= 10) {
      return { label: 'Very High', cls: 'uvi-very-high' };
    }

    return {
      label: 'Extreme',
      cls: 'uvi-extreme'
    };
  }

  /* ──────────────────────────────────────────
     FETCH WITH TIMEOUT
  ────────────────────────────────────────── */
  async function fetchWithTimeout(url, options = {}, timeout = 10000) {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      return response;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /* ──────────────────────────────────────────
     LOCATION DETECTION
  ────────────────────────────────────────── */
  async function detectLocation() {

    return new Promise((resolve) => {

      if (!navigator.geolocation) {
        fallbackToIP(resolve);
        return;
      }

      navigator.geolocation.getCurrentPosition(

        async (pos) => {

          state.lat = pos.coords.latitude;
          state.lon = pos.coords.longitude;

          await reverseGeocode(state.lat, state.lon);

          resolve({
            lat: state.lat,
            lon: state.lon
          });
        },

        () => fallbackToIP(resolve),

        {
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }

  async function fallbackToIP(resolve) {

    try {

      const response = await fetchWithTimeout(API.IP_GEO);

      const data = await response.json();

      state.lat = data.latitude;
      state.lon = data.longitude;

      state.city =
        data.city ||
        data.region ||
        'Your location';

    } catch {

      state.lat = 51.5074;
      state.lon = -0.1278;
      state.city = 'London';
    }

    resolve({
      lat: state.lat,
      lon: state.lon
    });
  }

  async function reverseGeocode(lat, lon) {

    if (state.city) return;

    try {

      const url =
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

      const response = await fetchWithTimeout(url, {
        headers: {
          'Accept-Language': 'en'
        }
      });

      const data = await response.json();

      state.city =
        data?.address?.city ||
        data?.address?.town ||
        data?.address?.village ||
        data?.address?.county ||
        'Your location';

    } catch {

      state.city = 'Your location';
    }
  }

  /* ──────────────────────────────────────────
     FETCH WEATHER
  ────────────────────────────────────────── */
  async function fetchWeather(lat, lon) {

    const params = new URLSearchParams({

      latitude: lat,
      longitude: lon,

      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'weather_code',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'surface_pressure',
        'visibility',
        'dew_point_2m',
        'uv_index',
      ].join(','),

      hourly: [
        'temperature_2m',
        'precipitation_probability',
        'wind_speed_10m'
      ].join(','),

      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'sunrise',
        'sunset',
        'uv_index_max',
        'precipitation_probability_max',
      ].join(','),

      forecast_days: 7,
      timezone: 'auto',
    });

    const response = await fetchWithTimeout(
      `${API.GEO}?${params}`
    );

    if (!response.ok) {
      throw new Error(`Weather API ${response.status}`);
    }

    return response.json();
  }

  /* ──────────────────────────────────────────
     UPDATE CURRENT WEATHER
  ────────────────────────────────────────── */
  function updateCurrentWeather(data) {

    const c = data.current;

    const temp = Math.round(c.temperature_2m);
    const feels = Math.round(c.apparent_temperature);
    const humidity = c.relative_humidity_2m;
    const wind = Math.round(c.wind_speed_10m);
    const pressure = Math.round(c.surface_pressure);

    const visibility =
      c.visibility != null
        ? (c.visibility / 1000).toFixed(1)
        : '--';

    const dewPoint = Math.round(c.dew_point_2m);
    const cloudCover = c.cloud_cover;
    const uvi = c.uv_index ?? 0;

    const weatherCode = c.weather_code;

    const icon =
      WMO_ICON[weatherCode] || '🌤️';

    const description =
      WMO[weatherCode] || 'Unknown';

    setText('current-temp', `${temp}°C`);
    setText('current-icon', icon);
    setText('current-desc', description);
    setText('current-city', state.city);

    setText(
      'temp-high',
      `↑ ${Math.round(data.daily.temperature_2m_max[0])}°C`
    );

    setText(
      'temp-low',
      `↓ ${Math.round(data.daily.temperature_2m_min[0])}°C`
    );

    setText('wind-speed', `${wind} km/h`);
    setText('humidity-val', `${humidity}%`);
    setText('visibility-val', `${visibility} km`);
    setText('pressure-val', `${pressure} hPa`);
    setText('dew-point-val', `${dewPoint}°C`);
    setText('cloud-cover-val', `${cloudCover}%`);
    setText('feels-like-val', `${feels}°C`);
    setText('uv-index-val', uvi.toFixed(1));

    setText(
      'precip-prob-val',
      `${data.daily.precipitation_probability_max[0]}%`
    );

    const uvInfo = uviLabel(uvi);

    const uvEl = $('uv-index-label');

    if (uvEl) {
      uvEl.textContent = uvInfo.label;
      uvEl.className = uvInfo.cls;
    }

    setText(
      'sunrise-val',
      formatTime(data.daily.sunrise[0])
    );

    setText(
      'sunset-val',
      formatTime(data.daily.sunset[0])
    );

    const ctx = {
      temp,
      feelsLike: feels,
      humidity,
      windSpeed: wind,
      pressure,
      visibility,
      dewPoint,
      cloudCover,
      uvi,
      description,
      icon,
      city: state.city,
    };

    state.weather = ctx;

    if (window.CliFix_AI) {
      window.CliFix_AI.setWeatherContext(ctx);
    }
  }

  /* ──────────────────────────────────────────
     HOURLY FORECAST
  ────────────────────────────────────────── */
  function updateHourlyForecast(data) {

    const container = $('hourly-forecast');

    if (!container) return;

    const now = new Date();

    const times = data.hourly.time || [];
    const temps = data.hourly.temperature_2m || [];

    let html = '';
    let count = 0;

    for (let i = 0; i < times.length && count < 12; i++) {

      const t = new Date(times[i]);

      if (t <= now) continue;

      html += `
        <div class="hourly-item">
          <div class="hourly-time">
            ${formatTime(times[i])}
          </div>

          <div class="hourly-icon">
            🌡️
          </div>

          <div class="hourly-temp">
            ${Math.round(temps[i])}°
          </div>
        </div>
      `;

      count++;
    }

    container.innerHTML =
      html ||
      '<p class="loading-text">No forecast data</p>';
  }

  /* ──────────────────────────────────────────
     WEEKLY FORECAST
  ────────────────────────────────────────── */
  function update7DayForecast(data) {

    const container = $('weekly-forecast');

    if (!container) return;

    const days = data.daily.time || [];
    const maxT = data.daily.temperature_2m_max || [];
    const minT = data.daily.temperature_2m_min || [];
    const codes = data.daily.weather_code || [];
    const precip =
      data.daily.precipitation_probability_max || [];

    let html = '';

    for (let i = 0; i < days.length; i++) {

      const isToday = i === 0;

      html += `
        <div class="forecast-day ${isToday ? 'forecast-today' : ''}">
          
          <div class="forecast-day-label">
            ${isToday ? 'Today' : formatDay(days[i])}
          </div>

          <div class="forecast-icon">
            ${WMO_ICON[codes[i]] || '🌤️'}
          </div>

          <div class="forecast-desc">
            ${WMO[codes[i]] || '--'}
          </div>

          <div class="forecast-temps">
            <span class="forecast-max">
              ${Math.round(maxT[i])}°
            </span>

            <span class="forecast-min">
              ${Math.round(minT[i])}°
            </span>
          </div>

          <div class="forecast-precip">
            💧 ${precip[i]}%
          </div>

        </div>
      `;
    }

    container.innerHTML = html;
  }

  /* ──────────────────────────────────────────
     CHART HELPERS
  ────────────────────────────────────────── */
  function destroyChart(id) {

    if (state.charts[id]) {

      state.charts[id].destroy();

      delete state.charts[id];
    }
  }

  /* ──────────────────────────────────────────
     RENDER CHARTS
  ────────────────────────────────────────── */
  function renderCharts(data) {

    if (typeof Chart === 'undefined') {
      return;
    }

    const labels =
      (data.hourly.time || [])
      .slice(0, 24)
      .map(formatTime);

    const chartDefaults = {

      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        }
      },

      scales: {

        x: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.45)',
            font: { size: 10 }
          }
        },

        y: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.45)',
            font: { size: 10 }
          }
        }
      }
    };

    /* TEMPERATURE CHART */
    const tempCanvas = $('temp-chart');

    if (tempCanvas) {

      destroyChart('temp');

      const ctx = tempCanvas.getContext('2d');

      const gradient =
        ctx.createLinearGradient(0, 0, 0, 200);

      gradient.addColorStop(0, 'rgba(74,222,128,0.4)');
      gradient.addColorStop(1, 'rgba(74,222,128,0)');

      state.charts.temp = new Chart(ctx, {

        type: 'line',

        data: {
          labels,

          datasets: [{
            data:
              (data.hourly.temperature_2m || []).slice(0, 24),

            borderColor: '#4ade80',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          }]
        },

        options: chartDefaults,
      });
    }

    /* RAIN CHART */
    const rainCanvas = $('rain-chart');

    if (rainCanvas) {

      destroyChart('rain');

      state.charts.rain = new Chart(
        rainCanvas.getContext('2d'),

        {
          type: 'bar',

          data: {
            labels,

            datasets: [{
              data:
                (data.hourly.precipitation_probability || [])
                .slice(0, 24),

              backgroundColor: 'rgba(96,165,250,0.6)',
              borderColor: '#60a5fa',
              borderWidth: 1,
              borderRadius: 4,
            }]
          },

          options: chartDefaults,
        }
      );
    }

    /* WIND CHART */
    const windCanvas = $('wind-chart');

    if (windCanvas) {

      destroyChart('wind');

      state.charts.wind = new Chart(
        windCanvas.getContext('2d'),

        {
          type: 'line',

          data: {
            labels,

            datasets: [{
              data:
                (data.hourly.wind_speed_10m || [])
                .slice(0, 24),

              borderColor: '#facc15',
              backgroundColor: 'rgba(250,204,21,0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 1,
            }]
          },

          options: chartDefaults,
        }
      );
    }
  }

  /* ──────────────────────────────────────────
     LOADING / ERROR
  ────────────────────────────────────────── */
  function setLoading(isLoading) {

    const loader = $('weather-loader');

    if (loader) {
      loader.style.display =
        isLoading ? 'flex' : 'none';
    }
  }

  function setError(message) {

    setText(
      'current-desc',
      message || 'Unable to load weather'
    );

    console.error('[CliFix Weather]', message);
  }

  /* ──────────────────────────────────────────
     MAIN INIT
  ────────────────────────────────────────── */
  async function init() {

    if (state.isLoading) {
      return;
    }

    state.isLoading = true;

    setLoading(true);

    try {

      const { lat, lon } =
        await detectLocation();

      const data =
        await fetchWeather(lat, lon);

      updateCurrentWeather(data);

      updateHourlyForecast(data);

      update7DayForecast(data);

      if (typeof Chart !== 'undefined') {

        renderCharts(data);

      } else {

        if (!state.waitingForChart) {

          state.waitingForChart = true;

          document.addEventListener(
            'chartjs-loaded',

            () => {

              state.waitingForChart = false;

              renderCharts(data);
            },

            { once: true }
          );
        }
      }

    } catch (err) {

      console.error(
        '[CliFix Weather] Init failed:',
        err
      );

      setError(
        'Weather unavailable — check connection'
      );

    } finally {

      setLoading(false);

      state.isLoading = false;
    }
  }

  /* ──────────────────────────────────────────
     BOOTSTRAP
  ────────────────────────────────────────── */
  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();
  }

  /* ──────────────────────────────────────────
     VISIBILITY OPTIMIZATION
  ────────────────────────────────────────── */
  document.addEventListener(
    'visibilitychange',

    () => {

      if (!document.hidden) {
        init();
      }
    }
  );

  /* ──────────────────────────────────────────
     AUTO REFRESH
  ────────────────────────────────────────── */
  setInterval(() => {

    if (!document.hidden) {
      init();
    }

  }, 10 * 60 * 1000);

  /* ──────────────────────────────────────────
     EXPOSE GLOBAL API
  ────────────────────────────────────────── */
  window.CliFix_Weather = {

    refresh: init,

    getState: () => ({
      ...state
    })
  };

})();