// ═══════════════════════════════════════════════════════
// MAIN INITIALIZATION & SEARCH
// ═══════════════════════════════════════════════════════

async function init() {
  initCharts();
  updateEcoTipsForWeather(0);
  updateGlobalTreeCount();
  updateAuthUI();

  // ── ClifixHero: initialise the animated hero background ──
  if (typeof ClifixHero !== 'undefined' && ClifixHero.init) {
    ClifixHero.init();
    // Placeholder – will be replaced by real data within seconds
    ClifixHero.setCO2('...');
  }

  const user = getCurrentUser();
  const promptDiv = document.getElementById('login-prompt-wrap');
  const trackerDiv = document.getElementById('tracker-dashboard');
  if (user) {
    promptDiv.style.display = 'none';
    trackerDiv.style.display = 'block';
    try {
      const token = localStorage.getItem('clixfix_token');
      const res = await fetch(`${API_BASE}/api/user/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        currentState = {
          user: { name: data.user.username, streak: data.user.streak, lastActive: data.user.lastActive },
          stats: { carbonSaved: data.user.carbonSaved, energySaved: 0, waterSaved: 0, greenScore: 0, treesSaved: data.user.treesPlanted },
          actions: {},
          achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
          challenge: WEEK_CHALLENGES[Math.floor(Math.random() * WEEK_CHALLENGES.length)],
          history: data.user.actions.slice(-10).map(a => ({
            date: new Date(a.date).toLocaleString(),
            action: a.type,
            desc: `${ECO_ACTIONS[a.type]?.name || a.type} — saved ${a.co2Saved}kg CO₂ · +${a.pointsEarned} pts`,
            icon: ECO_ACTIONS[a.type]?.icon || 'leaf'
          }))
        };
        data.user.actions.forEach(a => {
          if (!currentState.actions[a.type]) currentState.actions[a.type] = { ...ECO_ACTIONS[a.type], count: 0 };
          currentState.actions[a.type].count++;
        });
        const totalPoints = data.user.ecoPoints;
        currentState.stats.greenScore = Math.min(Math.round((totalPoints / 1000) * 100), 100);
        renderTracker(currentState, user);
        updateGlobalTreeCount(data.global.totalTrees);
      }
    } catch (e) { console.warn('Could not fetch user stats on load'); }
  } else {
    promptDiv.style.display = 'block';
    trackerDiv.style.display = 'none';
  }

  let lat = 13.41, lon = 122.56;
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch (e) { console.warn('Geolocation denied, using Philippines default.'); }
  }
  currentLat = lat;
  currentLon = lon;

  currentLocationName = await reverseGeocode(lat, lon);
  const locEl = document.getElementById('location-display');
  if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${currentLocationName}</span>`;

  // ── Pass location to hero animation ──
  if (typeof ClifixHero !== 'undefined' && ClifixHero.setLocation) {
    ClifixHero.setLocation(currentLocationName, currentLat, currentLon);
  }

  initMap(lat, lon);

  try {
    const weatherData = await fetchWeather(lat, lon);
    updateWeatherUI(weatherData, currentLocationName);

    // ── Pass weather data to hero animation ──
    if (typeof ClifixHero !== 'undefined' && ClifixHero.setWeather) {
      ClifixHero.setWeather(weatherData, currentLocationName);
    }
  } catch (e) { console.warn('Weather error', e); }

  fetchAQI(lat, lon);   // AQI hero update is handled inside fetchAQI
  fetchCO2();            // CO₂ hero update is handled inside fetchCO2

  if (typeof initAQIAlerts === 'function') {
    initAQIAlerts();
  }

  // ── Phase 1 Climate Report ──────────────────────
  if (typeof loadClimateReport === 'function') {
    await loadClimateReport();
  }
  if (typeof initClimateReportActions === 'function') {
    initClimateReportActions();
  }

  setTimeout(() => refreshAIInsights(), 2000);

  // ⏱️ Guarantee hero CO₂ gets a real value, even if fetchCO2 fails silently
  setTimeout(() => {
    if (typeof ClifixHero !== 'undefined' && ClifixHero.setCO2) {
      const chip = document.getElementById('chip-co2');
      // If the chip is still showing the placeholder "...", update it
      if (chip && chip.textContent.includes('...')) {
        ClifixHero.setCO2('424');   // fallback estimate
      }
    }
  }, 7000);
}

// Search bar (main weather search)
document.getElementById('weather-search-btn')?.addEventListener('click', async () => {
  const city = document.getElementById('weather-search-input').value.trim();
  if (!city) return;
  const btn = document.getElementById('weather-search-btn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  try {
    const { lat, lon, name } = await geocode(city);
    currentLat = lat; currentLon = lon; currentLocationName = name;
    const data = await fetchWeather(lat, lon);
    updateWeatherUI(data, name);
    if (map) map.setView([lat, lon], 8);
    if (userMarker) userMarker.setLatLng([lat, lon]);
    fetchAQI(lat, lon);
    const locEl = document.getElementById('location-display');
    if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> <span>${name}</span>`;

    // Refresh climate report for the new location
    if (typeof loadClimateReport === 'function') {
      loadClimateReport();
    }

    // ── Update hero with new city ──
    if (typeof ClifixHero !== 'undefined') {
      ClifixHero.setLocation(name, lat, lon);
      ClifixHero.setWeather(data, name);
    }
  } catch (e) {
    showToast('City not found', 'Please try a different city name.');
  } finally {
    btn.innerHTML = '<i class="fas fa-search"></i>';
  }
});

document.getElementById('weather-search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('weather-search-btn').click();
});

// Start app
window.addEventListener('load', init);