/* ═══════════════════════════════════════════════════════════════
   CLIFIX — FOOTER & COMMUNITY IMPACT JAVASCRIPT
   footer.js  |  No external dependencies required.
   Load AFTER all other scripts (just before </body>).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     1. HELPER UTILITIES
  ────────────────────────────────────────────────────────────── */

  /**
   * Formats a raw number into a human-readable string.
   * e.g. 1234567 → "1,234,567"
   */
  function formatNum(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  /**
   * Runs a count-up animation on an element.
   * @param {HTMLElement} el - the target span
   * @param {number} target  - the final value
   * @param {number} [duration=2000] - animation duration ms
   */
  function countUp(el, target, duration) {
    if (!el) return;
    duration = duration || 2000;
    const start = performance.now();
    const initial = 0;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNum(initial + (target - initial) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatNum(target);
    }
    requestAnimationFrame(step);
  }

  /* ──────────────────────────────────────────────────────────────
     2. INTERSECTION OBSERVER — REVEAL + COUNT-UP
  ────────────────────────────────────────────────────────────── */

  function initReveal() {
    // fi-reveal: community impact section elements
    const fiObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);

        setTimeout(() => {
          el.classList.add('fi-visible');

          // Trigger count-up on stat numbers inside this element
          el.querySelectorAll('[data-count]').forEach((numEl) => {
            const val = parseInt(numEl.dataset.count, 10);
            if (!isNaN(val)) countUp(numEl, val, 2200);
          });

          // Animate progress bars inside this element
          el.querySelectorAll('.fi-card-bar, .fi-ch-bar').forEach((bar) => {
            bar.classList.add('fi-bar-animate');
          });
        }, delay);

        fiObserver.unobserve(el);
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('[data-fi-reveal]').forEach((el) => fiObserver.observe(el));

    // Impact cards individual stagger
    document.querySelectorAll('.fi-impact-card').forEach((card, i) => {
      card.style.setProperty('--i', i);
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          setTimeout(() => {
            e.target.classList.add('fi-visible');
            e.target.querySelectorAll('[data-count]').forEach((numEl) => {
              countUp(numEl, parseInt(numEl.dataset.count, 10), 2200);
            });
            e.target.querySelectorAll('.fi-card-bar').forEach((bar) => {
              bar.classList.add('fi-bar-animate');
            });
          }, i * 100);
          obs.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      obs.observe(card);
    });

    // cf-reveal: footer elements
    const cfObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('cf-visible');

        // Trigger count-up on snapshot numbers
        entry.target.querySelectorAll('[data-count]').forEach((numEl) => {
          const val = parseInt(numEl.dataset.count, 10);
          if (!isNaN(val)) countUp(numEl, val, 1800);
        });

        cfObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('[data-cf-reveal]').forEach((el) => cfObserver.observe(el));
  }

  /* ──────────────────────────────────────────────────────────────
     3. CANVAS PARTICLE SYSTEMS
  ────────────────────────────────────────────────────────────── */

  /**
   * Creates a lightweight canvas particle field.
   * @param {string} canvasId
   */
  function initParticleCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const PARTICLE_COUNT = 55;
    const particles = [];

    function resize() {
      w = canvas.width = canvas.parentElement.offsetWidth;
      h = canvas.height = canvas.parentElement.offsetHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * 1600,
        y: Math.random() * 900,
        r: Math.random() * 1.8 + 0.3,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.45 + 0.05,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Draw connection lines first (back layer)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,230,118,${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,230,118,${p.o})`;
        ctx.fill();

        // Move
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      });

      requestAnimationFrame(draw);
    }

    draw();
  }

  /* ──────────────────────────────────────────────────────────────
     4. LIVE COMMUNITY FEED
  ────────────────────────────────────────────────────────────── */

  const FEED_DATA = [
    { user: 'Liam S.',   action: 'planted a tree',              emoji: '🌳' },
    { user: 'Ana M.',    action: 'completed an eco challenge',  emoji: '♻️' },
    { user: 'Mark T.',   action: 'checked local AQI',           emoji: '🌫️' },
    { user: 'Priya K.',  action: 'logged a bike trip',          emoji: '🚲' },
    { user: 'Carlos R.', action: 'earned 50 eco points',        emoji: '⭐' },
    { user: 'Yuki N.',   action: 'chose a vegetarian meal',     emoji: '🥗' },
    { user: 'Sofia L.',  action: 'recycled 5 items',            emoji: '🗑️' },
    { user: 'James W.',  action: 'took a short shower',         emoji: '🚿' },
    { user: 'Amara D.',  action: 'used public transport',       emoji: '🚌' },
    { user: 'Leo P.',    action: 'earned Week Warrior badge',   emoji: '🔥' },
    { user: 'Nina B.',   action: 'shared the AQI report',       emoji: '📊' },
    { user: 'Diego F.',  action: 'hit a 7-day streak!',         emoji: '💪' },
  ];

  let feedIndex = 0;
  let feedInterval = null;

  function buildFeedCard(entry) {
    const card = document.createElement('div');
    card.className = 'fi-feed-card';
    card.innerHTML = `<span class="fi-feed-user">${entry.user}</span> ${entry.action} ${entry.emoji}`;
    return card;
  }

  function initFeed() {
    const track = document.getElementById('fi-feed-track');
    if (!track) return;

    // Seed with initial cards
    const count = 5;
    for (let i = 0; i < count; i++) {
      track.appendChild(buildFeedCard(FEED_DATA[i % FEED_DATA.length]));
    }
    feedIndex = count;

    // Every 2.8s, fade in a new card at the end and remove the oldest
    feedInterval = setInterval(() => {
      // Fade out first card
      const first = track.firstElementChild;
      if (first) {
        first.style.opacity = '0';
        first.style.transform = 'translateX(-20px)';
        first.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => first.remove(), 420);
      }

      // Append new card (fade in)
      const newCard = buildFeedCard(FEED_DATA[feedIndex % FEED_DATA.length]);
      feedIndex++;
      newCard.style.opacity = '0';
      newCard.style.transform = 'translateX(20px)';
      newCard.style.transition = 'opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s';
      track.appendChild(newCard);

      // Trigger transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          newCard.style.opacity = '1';
          newCard.style.transform = 'translateX(0)';
        });
      });
    }, 2800);
  }

  /* ──────────────────────────────────────────────────────────────
     5. LEADERBOARD
  ────────────────────────────────────────────────────────────── */

  const LEADERBOARD_DATA = [
    { name: 'EcoHero_Alex',   pts: 8420, badge: '🥇' },
    { name: 'GreenQueen_M',   pts: 7915, badge: '🥈' },
    { name: 'PlanetSaver99',  pts: 7341, badge: '🥉' },
    { name: 'TreeHugger_K',   pts: 5890, badge: null },
    { name: 'ClimateNinja_J', pts: 5212, badge: null },
    { name: 'EcoWarrior_S',   pts: 4788, badge: null },
    { name: 'GreenMachine_D', pts: 4105, badge: null },
    { name: 'EarthFirst_L',   pts: 3622, badge: null },
  ];

  function initLeaderboard() {
    const list = document.getElementById('fi-leaderboard');
    if (!list) return;

    LEADERBOARD_DATA.forEach((entry, i) => {
      const rank = i + 1;
      const row = document.createElement('div');
      row.className = `fi-lb-row${rank <= 3 ? ` fi-lb-top-${rank}` : ''}`;
      row.innerHTML = `
        <span class="fi-lb-rank">${entry.badge || '#' + rank}</span>
        <div class="fi-lb-avatar">${entry.name[0].toUpperCase()}</div>
        <span class="fi-lb-name">${entry.name}</span>
        <span class="fi-lb-pts">${formatNum(entry.pts)}<span class="fi-lb-pts-label"> pts</span></span>
      `;
      list.appendChild(row);
    });
  }

  /* ──────────────────────────────────────────────────────────────
     6. WEEKLY CHALLENGES
  ────────────────────────────────────────────────────────────── */

  const CHALLENGE_DATA = [
    { icon: '🚲', title: 'Bike Week',          pct: 68, participants: '3,241 joined',  desc: 'Bike instead of driving 5× this week'  },
    { icon: '🥗', title: 'Veggie Days',         pct: 52, participants: '5,812 joined',  desc: 'Eat 7 vegetarian meals this week'        },
    { icon: '♻️', title: 'Recycle Champion',    pct: 81, participants: '2,107 joined',  desc: 'Recycle items 10 times this week'        },
    { icon: '🚿', title: 'Short Shower Sprint', pct: 43, participants: '1,490 joined',  desc: 'Take 7 short showers this week'          },
    { icon: '🌳', title: 'Plant-A-Tree',        pct: 29, participants: '987 joined',    desc: 'Plant or fund a tree this week'          },
    { icon: '🚌', title: 'Transit Hero',        pct: 61, participants: '4,055 joined',  desc: 'Use public transport 5× this week'       },
  ];

  function initChallenges() {
    const grid = document.getElementById('fi-challenges-grid');
    if (!grid) return;

    CHALLENGE_DATA.forEach((ch) => {
      const card = document.createElement('div');
      card.className = 'fi-challenge-card';
      card.innerHTML = `
        <span class="fi-ch-icon">${ch.icon}</span>
        <div class="fi-ch-title">${ch.title}</div>
        <div class="fi-ch-participants"><i class="fas fa-users" style="margin-right:6px;font-size:0.75em"></i>${ch.participants}</div>
        <div class="fi-ch-bar-wrap">
          <div class="fi-ch-bar" style="--fi-ch-w:${ch.pct}%"></div>
        </div>
        <div class="fi-ch-pct">${ch.pct}% complete</div>
        <button class="fi-ch-btn" onclick="document.getElementById('gamified-eco')?.scrollIntoView({behavior:'smooth'})">
          Join Challenge →
        </button>
      `;
      grid.appendChild(card);
    });

    // Observe challenges for bar animation
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.fi-ch-bar').forEach((bar) => {
          bar.classList.add('fi-bar-animate');
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    obs.observe(grid);
  }

  /* ──────────────────────────────────────────────────────────────
     7. IMPACT MAP PLACEHOLDER (Leaflet hook)
  ────────────────────────────────────────────────────────────── */

  /**
   * initFIMap — called once Leaflet is available.
   * Replace the placeholder div with a real Leaflet map.
   * HOOK: Extend this function when a real API is available.
   */
  function initFIMap() {
    const container = document.getElementById('fi-map-container');
    const placeholder = document.getElementById('fi-map-placeholder');
    if (!container || typeof L === 'undefined') return;

    // Hide placeholder
    if (placeholder) placeholder.style.display = 'none';

    // Create map
    const fiMap = L.map('fi-map-container', {
      center: [20, 0],
      zoom: 2,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '',
      maxZoom: 18,
    }).addTo(fiMap);

    // Demo markers — HOOK: replace coords with real API data
    const DEMO_MARKERS = [
      { lat: 51.5, lon: -0.09,    type: 'tree',   label: 'London — 12 trees planted' },
      { lat: 40.71, lon: -74.0,   type: 'action',  label: 'New York — 89 eco actions' },
      { lat: 48.85, lon: 2.35,    type: 'co2',     label: 'Paris — 4.2t CO₂ saved'    },
      { lat: 35.68, lon: 139.69,  type: 'tree',   label: 'Tokyo — 31 trees planted'  },
      { lat: -33.86, lon: 151.2,  type: 'action',  label: 'Sydney — 56 eco actions'   },
      { lat: 28.6,  lon: 77.2,    type: 'co2',     label: 'Delhi — 2.8t CO₂ saved'    },
      { lat: -23.5, lon: -46.6,   type: 'tree',   label: 'São Paulo — 8 trees'        },
      { lat: 55.75, lon: 37.62,   type: 'action',  label: 'Moscow — 19 eco actions'   },
      { lat: 1.35,  lon: 103.82,  type: 'action',  label: 'Singapore — 44 eco actions'},
      { lat: 52.37, lon: 4.89,    type: 'tree',   label: 'Amsterdam — 6 trees'        },
      { lat: 8.48,  lon: 124.65,  type: 'tree',   label: 'Iligan City — 22 trees'     },
    ];

    const COLOR_MAP = { tree: '#00E676', co2: '#FF7043', action: '#42A5F5' };

    DEMO_MARKERS.forEach((m) => {
      const color = COLOR_MAP[m.type] || '#00E676';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;
          border-radius:50%;
          background:${color};
          box-shadow:0 0 12px ${color},0 0 24px ${color}66;
          border:2px solid rgba(255,255,255,0.3);
          animation: fi-pulse 1.8s ease-in-out infinite;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([m.lat, m.lon], { icon })
        .addTo(fiMap)
        .bindPopup(`
          <div style="font-family:'Outfit',sans-serif;color:#E8F5E9;background:#0A160F;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,230,118,0.25);font-size:0.85rem;">
            ${m.label}
          </div>
        `, { className: 'fi-map-popup' });
    });

    // HOOK: Future — fetch real data and add cluster layer
    // const realData = await fetch('/api/community/map-points');
    // const points = await realData.json();
    // points.forEach(p => addMarker(fiMap, p));
  }

  /* ──────────────────────────────────────────────────────────────
     8. FOOTER — USER IMPACT SNAPSHOT
  ────────────────────────────────────────────────────────────── */

  /**
   * Checks if a user is logged in (using the existing getCurrentUser fn).
   * Populates the footer snapshot with personal or global stats.
   */
  function initFooterSnapshot() {
    const labelEl = document.getElementById('cf-snap-label');
    const treesEl = document.getElementById('cf-snap-trees');
    const co2El   = document.getElementById('cf-snap-co2');
    const actsEl  = document.getElementById('cf-snap-actions');

    // Try to get live user data from the existing auth module
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;

    if (user && typeof currentState !== 'undefined' && currentState && currentState.stats) {
      // ── Logged in: show personal stats ──
      if (labelEl) labelEl.textContent = `Your Impact, ${user.name.split(' ')[0]}`;

      const trees = currentState.stats.treesSaved || 0;
      const co2   = Math.round(currentState.stats.carbonSaved || 0);
      const acts  = Object.values(currentState.actions || {}).reduce((sum, a) => sum + (a.count || 0), 0);

      if (treesEl) { treesEl.dataset.count = trees;  treesEl.textContent = '--'; }
      if (co2El)   { co2El.dataset.count   = co2;    co2El.textContent   = '--'; }
      if (actsEl)  { actsEl.dataset.count  = acts;   actsEl.textContent  = '--'; }
    } else {
      // ── Guest: show global stats ──
      if (labelEl) labelEl.textContent = 'Global Impact';
      if (treesEl) { treesEl.dataset.count = 847329;  treesEl.textContent = '--'; }
      if (co2El)   { co2El.dataset.count   = 3241;    co2El.textContent   = '--'; }
      if (actsEl)  { actsEl.dataset.count  = 2189450; actsEl.textContent  = '--'; }
    }
  }

  /* ──────────────────────────────────────────────────────────────
     9. FOOTER — ANIMATED TAGLINE (TYPING EFFECT)
  ────────────────────────────────────────────────────────────── */

  const TAGLINES = [
    'Together, we don\'t just track climate. We change it.',
    'Every action ripples into the future.',
    'Your eco choices matter more than you think.',
    'One planet. One community. One Clifix.',
    'Building a greener tomorrow, one action at a time.',
  ];

  let taglineIndex = 0;
  let charIndex    = 0;
  let isDeleting   = false;
  let taglineTimer = null;

  function typeTagline() {
    const el = document.getElementById('cf-tagline');
    if (!el) return;

    const full = TAGLINES[taglineIndex];

    // Ensure cursor spans exists
    let cursor = el.querySelector('.cf-cursor');
    if (!cursor) {
      cursor = document.createElement('span');
      cursor.className = 'cf-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      el.appendChild(cursor);
    }

    // Update text node before the cursor
    const textNode = el.firstChild;

    if (!isDeleting) {
      charIndex++;
      const text = full.substring(0, charIndex);
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = text;
      } else {
        el.insertBefore(document.createTextNode(text), cursor);
      }

      if (charIndex === full.length) {
        // Pause before deleting
        isDeleting = true;
        taglineTimer = setTimeout(typeTagline, 3200);
        return;
      }
    } else {
      charIndex--;
      const text = full.substring(0, charIndex);
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        textNode.textContent = text;
      }

      if (charIndex === 0) {
        isDeleting = false;
        taglineIndex = (taglineIndex + 1) % TAGLINES.length;
        taglineTimer = setTimeout(typeTagline, 400);
        return;
      }
    }

    const speed = isDeleting ? 28 : 52;
    taglineTimer = setTimeout(typeTagline, speed);
  }

  /* ──────────────────────────────────────────────────────────────
     10. SCROLL PROGRESS INDICATOR
  ────────────────────────────────────────────────────────────── */

  function initScrollProgress() {
    const bar = document.getElementById('cf-scroll-bar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrolled = document.documentElement.scrollTop;
      const total    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct      = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────────────────────
     11. FOOTER NEWSLETTER (standalone handler for footer input)
  ────────────────────────────────────────────────────────────── */

  function initFooterNewsletter() {
    const btn   = document.getElementById('cf-newsletter-btn');
    const input = document.getElementById('footer-newsletter-email');
    if (!btn || !input) return;

    function subscribe() {
      const email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (typeof showToast === 'function') showToast('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      const list = JSON.parse(localStorage.getItem('clixfix_newsletter') || '[]');
      if (list.includes(email)) {
        if (typeof showToast === 'function') showToast('Already subscribed!', 'You\'re already on our list. 💚');
        return;
      }
      list.push(email);
      localStorage.setItem('clixfix_newsletter', JSON.stringify(list));
      input.value = '';
      if (typeof showToast === 'function') showToast('Subscribed! 💚', 'You\'ll receive weekly eco insights.');
      else alert('Subscribed! You\'ll receive weekly eco insights.');
    }

    btn.addEventListener('click', subscribe);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') subscribe(); });
  }

  /* ──────────────────────────────────────────────────────────────
     12. LIVE EARTH STATUS — optional real AQI hookup
  ────────────────────────────────────────────────────────────── */

  /**
   * If the main app has already fetched AQI data, mirror it in the footer.
   * Runs with a slight delay to allow main.js to populate globals.
   */
  function syncEarthStatus() {
    setTimeout(() => {
      // AQI from global variable set by weather.js / main.js
      if (typeof aqiValue !== 'undefined' && aqiValue) {
        const el = document.getElementById('cf-earth-aqi');
        if (el) countUp(el, aqiValue, 1200);
      }
      // CO₂ from the chip element set by hero.js
      const co2Chip = document.getElementById('chip-co2');
      if (co2Chip) {
        const co2Text = co2Chip.textContent.replace(/[^\d.]/g, '');
        const co2Num  = parseFloat(co2Text);
        if (!isNaN(co2Num)) {
          const el = document.getElementById('cf-earth-co2');
          if (el) el.innerHTML = `${co2Num.toFixed(1)}<span style="font-size:0.55em"> ppm</span>`;
        }
      }
    }, 3500);
  }

  /* ──────────────────────────────────────────────────────────────
     13. SECTION PARTICLE CANVAS (community impact section)
  ────────────────────────────────────────────────────────────── */

  function initSectionParticles() {
    const canvas = document.getElementById('fi-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;
    let w, h;
    const pts = [];
    const N = 60;

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.3 + 0.05,
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,230,118,${p.o})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });
      requestAnimationFrame(frame);
    }
    frame();
  }

  /* ──────────────────────────────────────────────────────────────
     14. BOOTSTRAP — WIRE EVERYTHING TOGETHER
  ────────────────────────────────────────────────────────────── */

  function boot() {
    // Particle canvases
    initSectionParticles();
    initParticleCanvas('cf-footer-canvas');

    // Scroll progress bar
    initScrollProgress();

    // Reveal observers
    initReveal();

    // Community feed auto-scroll
    initFeed();

    // Leaderboard rows
    initLeaderboard();

    // Weekly challenge cards
    initChallenges();

    // Footer snapshot (user or global stats)
    initFooterSnapshot();

    // Footer newsletter handler
    initFooterNewsletter();

    // Typing tagline
    typeTagline();

    // Mirror earth status from main app data
    syncEarthStatus();

    // Map — wait for Leaflet to be ready
    if (typeof L !== 'undefined') {
      initFIMap();
    } else {
      // Leaflet not yet loaded; retry after a short delay
      setTimeout(() => {
        if (typeof L !== 'undefined') initFIMap();
      }, 2000);
    }

    // Re-sync snapshot if auth state changes later (e.g. after login)
    // The existing auth.js calls onAuthSuccess → updateAuthUI which reloads the page,
    // but in case of future SPA patterns, we expose a refresh hook.
    window.refreshFooterSnapshot = initFooterSnapshot;
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(); // end IIFE