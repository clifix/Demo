// ═══════════════════════════════════════════════════════════════
// WEATHER & AQI FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getEmoji(code) { return WMO_EMOJI[code] || '🌤️'; }
function getText(code) { return WMO_TEXT[code] || 'Unknown'; }

async function geocode(city) {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const d = await r.json();
    if (!d.results?.length) throw new Error('City not found');
    return {
        lat: d.results[0].latitude,
        lon: d.results[0].longitude,
        name: d.results[0].name + ', ' + (d.results[0].country || '')
    };
}

async function reverseGeocode(lat, lon) {
    try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const d = await r.json();
        const parts = [d.address?.city || d.address?.town || d.address?.village, d.address?.state, d.address?.country].filter(Boolean);
        return parts.join(', ') || 'Unknown location';
    } catch (e) {
        return 'Unknown location';
    }
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
    window.currentWeatherData = data;
    const cw = data.current_weather;
    const daily = data.daily;
    const hourly = data.hourly;
    const now = new Date();
    const hi = now.getHours();

    // Main card
    try {
        const todayEmoji = document.getElementById('today-emoji');
        if (todayEmoji) todayEmoji.textContent = getEmoji(cw.weathercode);
        
        const todayTemp = document.getElementById('today-temp');
        if (todayTemp) todayTemp.textContent = Math.round(cw.temperature) + '°C';
        
        const todayCondition = document.getElementById('today-condition');
        if (todayCondition) todayCondition.textContent = getText(cw.weathercode);
        
        const todayMax = document.getElementById('today-max');
        if (todayMax) todayMax.textContent = '↑ ' + Math.round(daily.temperature_2m_max[0]) + '°C';
        
        const todayMin = document.getElementById('today-min');
        if (todayMin) todayMin.textContent = '↓ ' + Math.round(daily.temperature_2m_min[0]) + '°C';
        
        const todayWind = document.getElementById('today-wind');
        if (todayWind) todayWind.textContent = Math.round(cw.windspeed) + ' km/h';
        
        const todayHumidity = document.getElementById('today-humidity');
        if (todayHumidity) todayHumidity.textContent = (hourly.relativehumidity_2m?.[hi] || '--') + '%';
        
        const todayVisibility = document.getElementById('today-visibility');
        if (todayVisibility) todayVisibility.textContent = Math.round((hourly.visibility?.[hi] || 0) / 1000) + ' km';
        
        const todayPressure = document.getElementById('today-pressure');
        if (todayPressure) todayPressure.textContent = Math.round(hourly.surface_pressure?.[hi] || 0) + ' hPa';
    } catch (e) {
        console.warn('Weather main card update error:', e);
    }

    // Stat strip
    try {
        const stripFeelslike = document.getElementById('strip-feelslike');
        if (stripFeelslike) stripFeelslike.textContent = Math.round(hourly.apparent_temperature?.[hi] || cw.temperature) + '°C';
        
        const uv = daily.uv_index_max?.[0] || 0;
        const stripUV = document.getElementById('strip-uv');
        if (stripUV) stripUV.textContent = uv.toFixed(1);
        
        const stripUVLabel = document.getElementById('strip-uv-label');
        if (stripUVLabel) stripUVLabel.textContent = uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : uv < 8 ? 'High' : 'Very High';
        
        const precip = daily.precipitation_sum?.[0] || 0;
        const stripPrecip = document.getElementById('strip-precip');
        if (stripPrecip) stripPrecip.textContent = (hourly.precipitation_probability?.[hi] || 0) + '%';
        
        // Eco Score
        const windScore = Math.min(cw.windspeed / 30, 1);
        const uvPenalty = uv > 8 ? 0.7 : 1;
        const precipBonus = precip > 0 ? 1.05 : 1;
        const ecoVal = Math.round(90 * uvPenalty * precipBonus - windScore * 10);
        const ecoScore = Math.max(40, Math.min(100, ecoVal));
        
        const stripEco = document.getElementById('strip-eco');
        if (stripEco) stripEco.textContent = ecoScore >= 85 ? 'A+' : ecoScore >= 75 ? 'A' : ecoScore >= 65 ? 'B' : ecoScore >= 55 ? 'C' : 'D';
        
        const stripEcoLabel = document.getElementById('strip-eco-label');
        if (stripEcoLabel) stripEcoLabel.textContent = ecoScore >= 85 ? 'Excellent eco day' : ecoScore >= 65 ? 'Good eco day' : 'High impact day';
    } catch (e) {
        console.warn('Weather stat strip update error:', e);
    }

    // Hourly forecast
    try {
        const hourlyEl = document.getElementById('hourly-scroll');
        if (hourlyEl) {
            hourlyEl.innerHTML = '';
            for (let i = hi; i < hi + 24; i++) {
                const idx = i % 24;
                const div = document.createElement('div');
                div.className = 'hourly-item';
                div.innerHTML = `<div class="hourly-time">${String(idx).padStart(2, '0')}:00</div><span class="hourly-emoji">${getEmoji(hourly.weathercode?.[i] || 0)}</span><div class="hourly-temp">${Math.round(hourly.temperature_2m?.[i] || 0)}°</div>`;
                hourlyEl.appendChild(div);
            }
        }
    } catch (e) {
        console.warn('Hourly forecast update error:', e);
    }

    // 7-day forecast
    try {
        const weeklyEl = document.getElementById('weekly-list');
        if (weeklyEl) {
            weeklyEl.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const date = new Date(daily.time[i]);
                const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                const div = document.createElement('div');
                div.className = 'day-item';
                div.innerHTML = `<span class="day-name">${dayName}</span><span class="day-emoji">${getEmoji(daily.weathercode[i])}</span><span class="day-temp-range"><span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span><span style="color:var(--text-muted)">·</span><span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span></span>`;
                weeklyEl.appendChild(div);
            }
        }
    } catch (e) {
        console.warn('Weekly forecast update error:', e);
    }

    // Fetch climate charts
    if (typeof fetchAndUpdateClimateCharts === 'function') {
        fetchAndUpdateClimateCharts(window.currentLat, window.currentLon);
    }

    // Check extreme weather alerts
    checkExtremeWeatherAlerts(data);

    // Refresh AI insights
    if (typeof refreshAIInsights === 'function') {
        refreshAIInsights();
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
    if (alerts.length > 0 && banner && bannerText) {
        bannerText.textContent = alerts[0];
        banner.classList.add('show');
    } else if (banner) {
        banner.classList.remove('show');
    }
}

// ── ENHANCED AQI ──────────────────────────────────────────────

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
        pm2_5: [{ limit: 12, label: 'Good', color: '#00E676' }, { limit: 35, label: 'Moderate', color: '#FFB300' },
                { limit: 55, label: 'Unhealthy', color: '#FF5252' }, { limit: 150, label: 'Very Unhealthy', color: '#9C27B0' },
                { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }],
        pm10:  [{ limit: 50, label: 'Good', color: '#00E676' }, { limit: 150, label: 'Moderate', color: '#FFB300' },
                { limit: 250, label: 'Unhealthy', color: '#FF5252' }, { limit: 350, label: 'Very Unhealthy', color: '#9C27B0' },
                { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }],
        no2:   [{ limit: 40, label: 'Good', color: '#00E676' }, { limit: 200, label: 'Moderate', color: '#FFB300' },
                { limit: 400, label: 'Unhealthy', color: '#FF5252' }, { limit: Infinity, label: 'Very Unhealthy', color: '#9C27B0' }],
        o3:    [{ limit: 50, label: 'Good', color: '#00E676' }, { limit: 100, label: 'Moderate', color: '#FFB300' },
                { limit: 168, label: 'Unhealthy', color: '#FF5252' }, { limit: 208, label: 'Very Unhealthy', color: '#9C27B0' },
                { limit: Infinity, label: 'Hazardous', color: '#7B1FA2' }]
    };
    const scale = thresholds[type] || thresholds.pm2_5;
    for (const t of scale) {
        if (value <= t.limit) return { label: t.label, color: t.color };
    }
    return { label: 'Hazardous', color: '#7B1FA2' };
}

async function fetchAQI(lat, lon) {
    try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone&hourly=european_aqi&forecast_days=1`;
        const r = await fetch(url);
        const d = await r.json();
        if (!d.current) throw new Error('No AQI data');
        window.currentAQIData = d;
        window.aqiValue = Math.round(d.current.european_aqi || 0);

        const aqi = window.aqiValue;
        const cat = getAQICategory(aqi);

        const aqiValEl = document.getElementById('aqi-value');
        if (aqiValEl) { aqiValEl.textContent = aqi; aqiValEl.style.color = cat.color; }
        
        const catEl = document.getElementById('aqi-category');
        if (catEl) { catEl.textContent = cat.label; catEl.className = 'aqi-label ' + cat.cls; }
        
        const adviceEl = document.getElementById('aqi-advice');
        if (adviceEl) adviceEl.textContent = cat.advice;

        const pm25 = parseFloat(d.current.pm2_5) || 0;
        const pm10 = parseFloat(d.current.pm10) || 0;
        const no2  = parseFloat(d.current.nitrogen_dioxide) || 0;
        const o3   = parseFloat(d.current.ozone) || 0;

        // Dominant pollutant
        const dominantEl = document.getElementById('dominant-text');
        if (dominantEl) {
            const weights = { pm2_5: 100, pm10: 70, no2: 80, o3: 90 };
            let max = 0, dominant = 'PM2.5';
            for (const [key, val] of Object.entries({ pm2_5: pm25, pm10: pm10, no2: no2, o3: o3 })) {
                const weighted = val * (weights[key] || 1);
                if (weighted > max) { max = weighted; dominant = key.toUpperCase(); }
            }
            dominantEl.textContent = `Dominant: ${dominant} · ${getPollutantStatus(pm25, 'pm2_5').label}`;
        }

        // Set pollutant rows
        function setPollutantRow(value, type, levelId, statusId) {
            const status = getPollutantStatus(value, type);
            const levelEl = document.getElementById(levelId);
            const statusEl = document.getElementById(statusId);
            if (levelEl) levelEl.textContent = value.toFixed(1);
            if (statusEl) { statusEl.textContent = status.label; statusEl.style.color = status.color; }
        }
        setPollutantRow(pm25, 'pm2_5', 'pm25-level', 'pm25-status');
        setPollutantRow(pm10, 'pm10', 'pm10-level', 'pm10-status');
        setPollutantRow(no2,  'no2',  'no2-level',  'no2-status');
        setPollutantRow(o3,   'o3',   'o3-level',   'o3-status');

        // Health impact
        const health = {};
        if (aqi > 100) {
            health.children = 'Reduce prolonged outdoor play.';
            health.asthma = 'Limit outdoor exertion, keep inhaler nearby.';
            health.activity = 'Consider indoor activities for sensitive groups.';
        } else if (aqi > 150) {
            health.children = 'Avoid outdoor play.';
            health.asthma = 'Avoid outdoor activities, keep windows closed.';
            health.activity = 'Avoid strenuous outdoor exercise.';
        } else if (aqi > 200) {
            health.children = 'Stay indoors.';
            health.asthma = 'Stay indoors with air purifier, seek medical help if breathing difficulty occurs.';
            health.activity = 'Avoid all outdoor activity.';
        } else {
            health.children = 'No restrictions.';
            health.asthma = 'No restrictions.';
            health.activity = 'Ideal for outdoor exercise.';
        }
        
        const healthChildren = document.getElementById('health-children');
        const healthAsthma = document.getElementById('health-asthma');
        const healthActivity = document.getElementById('health-activity');
        if (healthChildren) healthChildren.innerHTML = `<i class="fas fa-child"></i> Children: ${health.children}`;
        if (healthAsthma) healthAsthma.innerHTML = `<i class="fas fa-lungs"></i> Asthma: ${health.asthma}`;
        if (healthActivity) healthActivity.innerHTML = `<i class="fas fa-running"></i> Activity: ${health.activity}`;

        // Draw gauge
        if (typeof drawAQIGauge === 'function') drawAQIGauge(aqi, cat.color);
        
        // Draw trend
        const hourlyData = d.hourly?.european_aqi?.slice(0, 24) || [];
        if (typeof drawAQITrend === 'function' && hourlyData.length > 0) drawAQITrend(hourlyData);

        // Update Hero
        if (typeof ClifixHero !== 'undefined' && ClifixHero.setAQI) {
            ClifixHero.setAQI(aqi, cat.label);
        }

        // Alert banner for high AQI
        if (aqi > 80) {
            const banner = document.getElementById('alert-banner');
            const bannerText = document.getElementById('alert-banner-text');
            if (banner && bannerText && !banner.classList.contains('show')) {
                bannerText.textContent = `⚠️ Air quality is ${cat.label} (AQI ${aqi}). ${cat.advice}`;
                banner.classList.add('show');
            }
        }

        // Refresh insights
        if (typeof refreshAIInsights === 'function') refreshAIInsights();

    } catch (e) {
        console.warn('AQI error:', e);
        const aqiVal = document.getElementById('aqi-value');
        const aqiCat = document.getElementById('aqi-category');
        const aqiAdvice = document.getElementById('aqi-advice');
        if (aqiVal) aqiVal.textContent = '--';
        if (aqiCat) aqiCat.textContent = 'Unavailable';
        if (aqiAdvice) aqiAdvice.textContent = 'Unable to fetch air quality data.';
    }
}

function initAQIAlerts() {
    const enableBtn = document.getElementById('enable-aqi-alerts');
    const disableBtn = document.getElementById('disable-aqi-alerts');
    const thresholdInput = document.getElementById('alert-threshold');
    const statusEl = document.getElementById('alert-status');

    if (!enableBtn || !disableBtn || !thresholdInput || !statusEl) return;

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
        data: {
            labels,
            datasets: [{
                label: 'AQI',
                data,
                borderColor: '#00E676',
                backgroundColor: 'rgba(0,230,118,0.07)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(10,30,15,0.95)', borderColor: 'rgba(0,230,118,0.3)', borderWidth: 1 }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,230,118,0.05)' }, ticks: { color: '#8FAD8A', maxTicksLimit: 5 } },
                x: { grid: { display: false }, ticks: { color: '#8FAD8A', maxTicksLimit: 8 } }
            }
        }
    });
}

// ── Climate Charts ────────────────────────────────────────────

async function fetchAndUpdateClimateCharts(lat, lon) {
    try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean&timezone=auto&forecast_days=7`);
        const d = await r.json();
        if (d.daily && window.tempChart) {
            const labels = d.daily.time.map((t, i) => i === 0 ? 'Today' : new Date(t).toLocaleDateString('en-US', { weekday: 'short' }));
            window.tempChart.data.labels = labels;
            window.tempChart.data.datasets[0].data = d.daily.temperature_2m_mean.map(v => parseFloat(v.toFixed(1)));
            window.tempChart.update();
            const avg = (d.daily.temperature_2m_mean.reduce((a, b) => a + b, 0) / d.daily.temperature_2m_mean.length).toFixed(1);
            const min = Math.min(...d.daily.temperature_2m_mean).toFixed(1);
            const max = Math.max(...d.daily.temperature_2m_mean).toFixed(1);
            const summaryEl = document.getElementById('temp-change-summary');
            if (summaryEl) summaryEl.textContent = `7-day avg: ${avg}°C · Range: ${min}°C – ${max}°C`;
        }
    } catch (e) {
        console.warn('Climate chart error:', e);
    }
}

// ── CO₂ Fetch ─────────────────────────────────────────────────

async function fetchCO2() {
    try {
        const r = await fetch('https://global-warming.org/api/co2-api');
        const d = await r.json();

        // Update old chart if exists
        if (d?.co2?.length > 0 && window.co2Chart) {
            const sorted = d.co2.sort((a, b) =>
                new Date(`${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`) -
                new Date(`${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`)
            );
            const recent = sorted.slice(-30);
            window.co2Chart.data.labels = recent.map(e => `${e.month}/${e.day}`);
            window.co2Chart.data.datasets[0].data = recent.map(e => parseFloat(e.cycle));
            window.co2Chart.update();
        }

        // Send latest CO2 to hero
        if (d?.co2?.length > 0) {
            const sorted = d.co2.sort((a, b) =>
                new Date(`${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`) -
                new Date(`${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`)
            );
            const latest = sorted[sorted.length - 1];
            const val = parseFloat(latest.cycle).toFixed(2);
            const co2LevelEl = document.getElementById('co2-level');
            if (co2LevelEl) co2LevelEl.textContent = `Current: ${val} ppm`;

            if (typeof ClifixHero !== 'undefined' && ClifixHero.setCO2) {
                ClifixHero.setCO2(parseFloat(val).toFixed(0));
            }
        }
    } catch (e) {
        console.warn('CO2 fetch error:', e);
        const co2LevelEl = document.getElementById('co2-level');
        if (co2LevelEl) co2LevelEl.textContent = 'Current: ~424 ppm (estimated)';
        if (typeof ClifixHero !== 'undefined' && ClifixHero.setCO2) {
            ClifixHero.setCO2('424');
        }
    }
}
