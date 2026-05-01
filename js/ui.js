// ═══════════════════════════════════════════════════════
// UI UTILITIES: CLOCK, PARTICLES, MOBILE MENU, NEWSLETTER, REPORTS, ETC.
// ═══════════════════════════════════════════════════════

(function () {
  var bar = document.getElementById('pre-bar');
  var status = document.getElementById('pre-status');
  var loader = document.getElementById('clifix-preloader');

  var steps = [
    { pct: 20, msg: 'Loading eco-intelligence modules...'},
    { pct: 42, msg: 'Connecting to weather API...'},
    { pct: 60, msg: 'Fetching air quality data...'},
    { pct: 78,  msg: 'Preparing climate dashboard...' },
    { pct: 92,  msg: 'Almost ready...' },
    { pct: 100, msg: 'Welcome to CliFix 🌿' }
  ];

  var i = 0;
  function tick() {
    if (i >= steps.length) return;
    var s = steps [i++];
    bar.style.width = s.pct + '%';
    status.textContent = s.msg;
    if (i < steps.length) setTimeout(tick, 400 + Math.random() * 300);
  }
  tick();

  function hideLoader() {
    bar.style.width = '100%';
      status.textContent = 'Welcome to CliFix 🌿';
      setTimeout(function () { loader.classList.add('hidden'); }, 500);
    }

    if (document.readyState === 'complete') {
      hideLoader();
    } else {
      window.addEventListener('load', hideLoader);
      // Fallback in case load takes too long
      setTimeout(hideLoader, 5000);
    }
  })();

// Live Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('live-clock');
  if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// Hero Canvas Particles
(function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h;
  const particles = [];

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 75; i++) {
    particles.push({
      x: Math.random() * 1400,
      y: Math.random() * 800,
      r: Math.random() * 2 + 0.4,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,230,118,${p.o})`;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > w) p.dx *= -1;
      if (p.y < 0 || p.y > h) p.dy *= -1;
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,230,118,${0.06 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// Mobile Menu
document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
  const nav = document.getElementById('nav-links');
  const isOpen = nav.style.display === 'flex';
  nav.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    nav.style.flexDirection = 'column';
    nav.style.position = 'absolute';
    nav.style.top = '68px';
    nav.style.right = '0';
    nav.style.background = 'rgba(7,13,10,0.97)';
    nav.style.border = '1px solid rgba(0,230,118,0.12)';
    nav.style.borderRadius = '0 0 16px 16px';
    nav.style.padding = '16px';
    nav.style.backdropFilter = 'blur(20px)';
    nav.style.zIndex = '999';
    nav.style.width = '240px';
    nav.style.gap = '4px';
  }
});

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    const nav = document.getElementById('nav-links');
    if (window.innerWidth < 768) nav.style.display = 'none';
  });
});

// Newsletter
document.getElementById('newsletter-btn')?.addEventListener('click', () => {
  const email = document.getElementById('newsletter-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Invalid Email', 'Please enter a valid email address.');
    return;
  }
  const subscribers = JSON.parse(localStorage.getItem('clixfix_newsletter') || '[]');
  if (subscribers.includes(email)) { showToast('Already subscribed!', 'You\'re already on our list. 💚'); return; }
  subscribers.push(email);
  localStorage.setItem('clixfix_newsletter', JSON.stringify(subscribers));
  document.getElementById('newsletter-email').value = '';
  showToast('Subscribed! 💚', 'You\'ll receive weekly eco insights.');
});

// Download Report (HTML)
document.getElementById('download-btn')?.addEventListener('click', () => {
  const style = `
    <style>
      body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 40px; }
      h1 { color: #00a040; } h2 { color: #006020; border-bottom: 2px solid #00a040; padding-bottom: 8px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; }
      .val { font-size: 2rem; font-weight: bold; color: #00a040; }
      table { width: 100%; border-collapse: collapse; } td, th { padding: 8px 12px; border: 1px solid #ddd; }
      th { background: #e8f5e1; }
    </style>`;

  const location = document.getElementById('location-display')?.textContent || 'Your Location';
  const temp = document.getElementById('today-temp')?.textContent || '--';
  const cond = document.getElementById('today-condition')?.textContent || '--';
  const wind = document.getElementById('today-wind')?.textContent || '--';
  const humidity = document.getElementById('today-humidity')?.textContent || '--';
  const pressure = document.getElementById('today-pressure')?.textContent || '--';
  const aqi = document.getElementById('aqi-value')?.textContent || '--';
  const aqiCat = document.getElementById('aqi-category')?.textContent || '--';
  const uv = document.getElementById('strip-uv')?.textContent || '--';
  const co2 = document.getElementById('co2-level')?.textContent || '~424 ppm';
  const eco = document.getElementById('strip-eco')?.textContent || '--';

  const html = `<!DOCTYPE html><html><head><title>ClixFix Climate Report</title>${style}</head><body>
    <h1>🌱 ClixFix Climate Report</h1>
    <p><strong>Location:</strong> ${location} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <h2>Current Weather</h2>
    <div class="grid">
      <div class="card"><div>Temperature</div><div class="val">${temp}</div><div>Condition: ${cond}</div></div>
      <div class="card"><div>Wind Speed</div><div class="val">${wind}</div><div>Humidity: ${humidity}</div></div>
      <div class="card"><div>Pressure</div><div class="val">${pressure}</div><div>UV Index: ${uv}</div></div>
      <div class="card"><div>Eco Score</div><div class="val">${eco}</div><div>Today's rating</div></div>
    </div>
    <h2>Air Quality</h2>
    <table><tr><th>AQI Value</th><th>Category</th><th>PM2.5</th><th>PM10</th></tr>
    <tr><td>${aqi}</td><td>${aqiCat}</td><td>${document.getElementById('pm25')?.textContent || '--'} µg/m³</td><td>${document.getElementById('pm10')?.textContent || '--'} µg/m³</td></tr></table>
    <h2>Global CO₂</h2><p>${co2}</p>
    <h2>7-Day Forecast</h2>
    <table><tr><th>Day</th><th>Condition</th><th>High</th><th>Low</th></tr>
    ${Array.from(document.querySelectorAll('.day-item')).map(el => {
    const cells = el.querySelectorAll('span');
    return `<tr><td>${cells[0]?.textContent || ''}</td><td>${cells[1]?.textContent || ''}</td><td>${cells[2]?.querySelector('.temp-max')?.textContent || ''}</td><td>${cells[2]?.querySelector('.temp-min')?.textContent || ''}</td></tr>`;
  }).join('')}
    </table>
    <br><p style="color:#888;font-size:0.8em;">Generated by ClixFix Eco-Weather Intelligence Platform · ${new Date().toISOString()}</p>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ClixFix-Report-${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Report Downloaded', 'Open the HTML file in your browser to print as PDF.');
});

// Share Report
document.getElementById('share-btn')?.addEventListener('click', async () => {
  const shareData = {
    title: 'ClixFix Climate Report',
    text: `🌍 Today's weather: ${document.getElementById('today-temp')?.textContent}, ${document.getElementById('today-condition')?.textContent}. AQI: ${document.getElementById('aqi-value')?.textContent}. Tracked with ClixFix!`,
    url: window.location.href
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (e) { }
  } else {
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      showToast('Copied to clipboard!', 'Share your climate report with friends.');
    } catch (err) {
      showToast('Sharing failed', 'Could not copy to clipboard. Please copy manually.');
    }
  }
});

// Close alert banner
window.closeAlertBanner = function () {
  document.getElementById('alert-banner').classList.remove('show');
};

// Active nav on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const scrollObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { threshold: 0.3, rootMargin: '-100px 0px -60% 0px' });
sections.forEach(s => scrollObserver.observe(s));

// Keyboard shortcut for AI panel
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && aiPanelOpen) toggleAIPanel();
  if (e.altKey && e.key === 'a') toggleAIPanel();
});