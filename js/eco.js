// ═══════════════════════════════════════════════════════════════
// ECO.JS — Gamified Eco Tips System for CliFix
// Features: Smart Daily Tip · XP/Level · Daily Challenge ·
//           Impact Tracker · Category Filter · Confetti ·
//           Bug-resistant localStorage · Streak (synced with GamifySystem)
// ═══════════════════════════════════════════════════════════════

(function EcoTipsSystem() {
  'use strict';

  // ─────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────
  const STORAGE_KEY = 'clifixEcoData';

  const XP_READ_TIP    = 5;
  const XP_COMPLETE    = 20;          // kept as fallback, real XP uses map
  const XP_LOGIN       = 10;          // not used here – GamifySystem handles login
  const XP_CHALLENGE   = 30;
  const XP_PER_LEVEL   = 100;

  const XP_COMPLETE_BY_DIFF = {
    easy:   10,
    medium: 25,
    hard:   50,
  };

  const LEVEL_TITLES = [
    '', 'Seedling', 'Sprout', 'Sapling', 'Eco Starter',
    'Green Advocate', 'Eco Warrior', 'Nature Guardian',
    'Earth Defender', 'Climate Champion', 'Planet Hero',
    'Legendary Eco', 'Global Guardian', 'Planetary Legend'
  ];

  const LEVEL_AVATARS = [
    '🌱','🌱','🌿','🍀','🌳','🦋','🌊','⚡','🌍','🌟','🏆','💎','🦅','🌌'
  ];

  // ─────────────────────────────────────────────
  // ECO TIP DATABASE (unchanged – same categories)
  // ─────────────────────────────────────────────
  const ECO_TIPS_DB = [
    // ENERGY
    {
      id: 'e01', category: 'energy', icon: '💡', difficulty: 'easy',
      title: 'Switch to LED Bulbs',
      desc: 'Replace incandescent bulbs with LEDs — they use 75% less energy and last 25× longer. A household can save up to 40 kg CO₂ per year from this single change.',
      co2: 3.3, water: 0, energy: 12,
    },
    {
      id: 'e02', category: 'energy', icon: '🔌', difficulty: 'easy',
      title: 'Unplug Idle Electronics',
      desc: 'Standby power "vampire drain" accounts for 5–10% of home energy use. Unplug chargers, TVs, and appliances when not in use or use smart power strips.',
      co2: 2.0, water: 0, energy: 7,
    },
    {
      id: 'e03', category: 'energy', icon: '☀️', difficulty: 'hard',
      title: 'Install Solar Panels',
      desc: 'Rooftop solar can offset 80–100% of household electricity. While upfront costs are high, payback is typically 6–10 years — then free energy for decades.',
      co2: 18.0, water: 0, energy: 60,
    },
    {
      id: 'e04', category: 'energy', icon: '🌡️', difficulty: 'medium',
      title: 'Set Smart Thermostat',
      desc: 'A programmable thermostat that adjusts when you sleep or leave home can reduce heating/cooling bills by 10–15%, saving ~0.6 tonnes CO₂ annually.',
      co2: 6.0, water: 0, energy: 20,
    },
    {
      id: 'e05', category: 'energy', icon: '🧺', difficulty: 'easy',
      title: 'Wash Clothes in Cold Water',
      desc: 'About 90% of a washing machine\'s energy goes to heating water. Switching to cold wash saves ~0.6 kg CO₂ per load with zero impact on cleaning quality.',
      co2: 0.6, water: 0, energy: 2,
    },
    // WATER
    {
      id: 'w01', category: 'water', icon: '🚿', difficulty: 'easy',
      title: 'Take Shorter Showers',
      desc: 'Every minute you cut from your shower saves roughly 9 litres of water. Aim for 5 minutes — a 2-minute reduction saves 6,570 litres per year.',
      co2: 0.3, water: 50, energy: 0.5,
    },
    {
      id: 'w02', category: 'water', icon: '🪴', difficulty: 'easy',
      title: 'Water Plants at Dawn or Dusk',
      desc: 'Watering in the heat of the day loses up to 30% to evaporation. Water at cooler times to ensure plants absorb more and you use significantly less.',
      co2: 0.0, water: 30, energy: 0.0,
    },
    {
      id: 'w03', category: 'water', icon: '🪣', difficulty: 'medium',
      title: 'Collect Rainwater',
      desc: 'A rain barrel can collect 1,300 litres per year for free garden watering. This reduces storm runoff and your water bill simultaneously.',
      co2: 0.5, water: 120, energy: 0.2,
    },
    {
      id: 'w04', category: 'water', icon: '🔧', difficulty: 'easy',
      title: 'Fix a Dripping Tap',
      desc: 'A single dripping tap wastes 15 litres per day — over 5,400 litres per year. A new washer costs under $1 and takes 10 minutes.',
      co2: 0.2, water: 90, energy: 0.1,
    },
    // FOOD
    {
      id: 'f01', category: 'food', icon: '🥗', difficulty: 'easy',
      title: 'Eat One Meat-Free Day',
      desc: 'Replacing a beef meal with plant-based alternatives saves up to 3.3 kg CO₂ per meal — equivalent to driving 20 km. One day a week adds up fast.',
      co2: 3.3, water: 15, energy: 0.4,
    },
    {
      id: 'f02', category: 'food', icon: '🛒', difficulty: 'easy',
      title: 'Buy Local & Seasonal Food',
      desc: 'Locally-grown food travels far fewer food miles and is fresher. Seasonal produce requires less energy in greenhouses and refrigeration.',
      co2: 1.5, water: 5, energy: 0.8,
    },
    {
      id: 'f03', category: 'food', icon: '♻️', difficulty: 'easy',
      title: 'Compost Food Waste',
      desc: 'Food rotting in landfill produces methane — 25× more potent than CO₂. Composting returns nutrients to soil, eliminating landfill methane and cutting fertiliser use.',
      co2: 1.2, water: 0, energy: 0.3,
    },
    {
      id: 'f04', category: 'food', icon: '🧊', difficulty: 'medium',
      title: 'Reduce Food Waste by Meal Planning',
      desc: 'One-third of all food produced globally is wasted. Plan meals weekly, make a shopping list, and use up leftovers — the average family saves over £700/year.',
      co2: 2.5, water: 20, energy: 0.6,
    },
    // LIFESTYLE
    {
      id: 'l01', category: 'lifestyle', icon: '🛍️', difficulty: 'easy',
      title: 'Use Reusable Shopping Bags',
      desc: 'A single reusable tote replaces ~700 plastic bags over its lifetime. Plastic bag production emits 1.58 kg CO₂ per bag — plus ocean pollution savings.',
      co2: 1.1, water: 2, energy: 0.4,
    },
    {
      id: 'l02', category: 'lifestyle', icon: '👗', difficulty: 'medium',
      title: 'Buy Secondhand Clothing',
      desc: 'Fashion is responsible for 10% of global CO₂ emissions. Buying one used item instead of new saves an average of 1.2 kg CO₂ and thousands of litres of water.',
      co2: 1.2, water: 10, energy: 0.5,
    },
    {
      id: 'l03', category: 'lifestyle', icon: '🌳', difficulty: 'medium',
      title: 'Plant a Native Tree',
      desc: 'A single tree absorbs around 22 kg of CO₂ per year. Native species support local biodiversity, need no watering after establishment, and clean local air.',
      co2: 5.0, water: 10, energy: 0.0,
    },
    {
      id: 'l04', category: 'lifestyle', icon: '📱', difficulty: 'easy',
      title: 'Switch to E-Statements & Paperless',
      desc: 'The average office worker uses 10,000 sheets of paper per year. Going paperless saves trees, water, and energy — usually cutting your paper footprint by 90%.',
      co2: 0.8, water: 8, energy: 0.3,
    },
    // TRANSPORT
    {
      id: 't01', category: 'transport', icon: '🚲', difficulty: 'medium',
      title: 'Cycle or Walk for Short Trips',
      desc: 'For trips under 5 km, cycling emits zero CO₂ vs ~1.2 kg per car trip. Regular cycling also improves health, reducing healthcare emissions indirectly.',
      co2: 2.1, water: 0, energy: 0.5,
    },
    {
      id: 't02', category: 'transport', icon: '🚌', difficulty: 'easy',
      title: 'Take Public Transport',
      desc: 'A bus carrying 40 people emits ~80% less CO₂ per passenger than solo car trips. For commuters, switching saves an average 1.5 tonnes CO₂ per year.',
      co2: 1.5, water: 0, energy: 0.4,
    },
    {
      id: 't03', category: 'transport', icon: '🚗', difficulty: 'medium',
      title: 'Carpool to Work',
      desc: 'Sharing a car journey with even one colleague halves your per-person transport emissions and cuts traffic congestion by a statistically significant amount.',
      co2: 1.2, water: 0, energy: 0.3,
    },
    {
      id: 't04', category: 'transport', icon: '✈️', difficulty: 'hard',
      title: 'Choose Train Over Short-Haul Flights',
      desc: 'A 1-hour flight emits 255 kg CO₂ per passenger. The equivalent train journey emits just 6 kg. For routes under 700 km, train is both greener and often faster.',
      co2: 12.0, water: 0, energy: 5.0,
    },
  ];

  // ─────────────────────────────────────────────
  // DAILY CHALLENGES POOL (unchanged)
  // ─────────────────────────────────────────────
  const DAILY_CHALLENGES = [
    { icon: '🚫', title: 'Plastic-Free Day', desc: 'Avoid all single-use plastics today — bags, bottles, straws, and packaging.' },
    { icon: '🚲', title: 'Ride or Walk', desc: 'Replace at least one car journey today with cycling or walking.' },
    { icon: '🥗', title: 'Plant-Based Meal', desc: 'Eat at least one fully plant-based meal today with no meat or dairy.' },
    { icon: '💡', title: 'Power-Down Hour', desc: 'Turn off all non-essential lights and unplug idle devices for at least 1 hour.' },
    { icon: '🚿', title: '3-Minute Shower', desc: 'Challenge yourself to shower in 3 minutes or less today.' },
    { icon: '♻️', title: 'Sort & Recycle', desc: 'Sort your waste correctly today and ensure all recyclables go in the right bin.' },
    { icon: '🛍️', title: 'Go Bag-Free', desc: 'Refuse all plastic bags today — bring your own or carry items by hand.' },
  ];

  // ─────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────
  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      console.warn('[EcoTips] Corrupted localStorage — resetting.', e);
      return defaultState();
    }
  }

  function defaultState() {
    return {
      xp: 0,
      level: 1,
      lastLoginDate: '',
      lastReadDate: '',          // for daily "read tip" XP limit
      completedTips: [],         // array of tip IDs
      impactCO2: 0,
      impactWater: 0,
      impactEnergy: 0,
      challenge: null,           // today's challenge { date, id, done, claimed }
      tipsRead: 0,
    };
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[EcoTips] Could not save to localStorage.', e);
    }
  }

  // ─────────────────────────────────────────────
  // XP & LEVEL LOGIC
  // ─────────────────────────────────────────────
  function xpForLevel(lvl) {
    return lvl * XP_PER_LEVEL;
  }

  function levelFromXP(xp) {
    return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  }

  function xpWithinLevel(xp) {
    return xp % XP_PER_LEVEL;
  }

  function addXP(state, amount, label, event) {
    const oldLevel = levelFromXP(state.xp);
    state.xp += amount;
    const newLevel = levelFromXP(state.xp);
    state.level = newLevel;

    if (event) {
      spawnXPFloat(`+${amount} XP`, event);
    } else {
      spawnXPFloatCenter(`+${amount} XP`);
    }

    if (newLevel > oldLevel) {
      setTimeout(() => showLevelUpOverlay(newLevel), 500);
    }
  }

  // ─────────────────────────────────────────────
  // DAILY STREAK – now reads from GamifySystem
  // ─────────────────────────────────────────────
  // (No local streak logic – all streak tracking is done by GamifySystem)

  // ─────────────────────────────────────────────
  // SMART TIP: rotate daily based on date seed
  // ─────────────────────────────────────────────
  function getTodaysTip() {
    const now = new Date();
    const seed = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    const idx = seed % ECO_TIPS_DB.length;
    return ECO_TIPS_DB[idx];
  }

  // ─────────────────────────────────────────────
  // DAILY CHALLENGE: one per day
  // ─────────────────────────────────────────────
  function getTodaysChallenge(state) {
    const today = todayStr();
    if (state.challenge && state.challenge.date === today) {
      return state.challenge;
    }
    const seed = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
    const idx = seed % DAILY_CHALLENGES.length;
    const challenge = {
      date: today,
      idx: idx,
      done: false,
      claimed: false,
    };
    state.challenge = challenge;
    return challenge;
  }

  // ─────────────────────────────────────────────
  // UI: XP Float animations (unchanged)
  // ─────────────────────────────────────────────
  function spawnXPFloat(text, event) {
    const container = document.getElementById('xp-floats');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = text;
    const x = event && event.clientX ? event.clientX : window.innerWidth / 2;
    const y = event && event.clientY ? event.clientY : window.innerHeight / 2;
    el.style.left = (x - 30) + 'px';
    el.style.top  = (y - 20) + 'px';
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function spawnXPFloatCenter(text) {
    const container = document.getElementById('xp-floats');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = text;
    el.style.left = '50%';
    el.style.top  = '30%';
    el.style.transform = 'translateX(-50%)';
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ─────────────────────────────────────────────
  // UI: Toast notification
  // ─────────────────────────────────────────────
  function ecoToast(title, body, icon = '🌿') {
    if (typeof window.showToast === 'function') {
      window.showToast(title, body);
      return;
    }
    const container = document.getElementById('eco-toasts');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'eco-toast';
    el.innerHTML = `
      <div class="eco-toast-icon">${icon}</div>
      <div class="eco-toast-body">
        <h4>${title}</h4>
        <p>${body}</p>
      </div>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3200);
  }

  // ─────────────────────────────────────────────
  // UI: Level-Up Overlay (unchanged)
  // ─────────────────────────────────────────────
  function showLevelUpOverlay(newLevel) {
    document.getElementById('eco-levelup-overlay')?.remove();
    const title = LEVEL_TITLES[Math.min(newLevel, LEVEL_TITLES.length - 1)] || 'Legend';
    const avatar = LEVEL_AVATARS[Math.min(newLevel, LEVEL_AVATARS.length - 1)] || '🌌';
    const overlay = document.createElement('div');
    overlay.id = 'eco-levelup-overlay';
    overlay.className = 'levelup-overlay';
    overlay.innerHTML = `
      <div class="levelup-box">
        <span class="levelup-emoji">${avatar}</span>
        <div class="levelup-title">Level Up! 🎉</div>
        <div class="levelup-subtitle">You've reached</div>
        <div class="levelup-new-level">Level ${newLevel} · ${title}</div>
        <button class="levelup-close" id="levelup-close-btn">Awesome! Let's continue →</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#levelup-close-btn').addEventListener('click', () => overlay.remove());
    fireConfetti();
    setTimeout(() => overlay?.remove(), 6000);
  }

  // ─────────────────────────────────────────────
  // UI: Confetti (unchanged)
  // ─────────────────────────────────────────────
  function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = [];
    const colors = ['#00E676','#00C853','#FFB300','#FF7043','#29B6F6','#CE93D8','#FFFFFF'];
    for (let i = 0; i < 180; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        w: 8 + Math.random() * 8,
        h: 6 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        opacity: 1,
      });
    }
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x  += p.vx;
        p.y  += p.vy;
        p.angle += p.spin;
        p.vy += 0.08;
        if (frame > 60) p.opacity -= 0.012;
      });
      frame++;
      if (frame < 180 && pieces.some(p => p.opacity > 0)) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(draw);
  }

  // ─────────────────────────────────────────────
  // RENDER: Player Card
  // ─────────────────────────────────────────────
  function renderPlayerCard(state) {
    const xp = state.xp;
    const level = levelFromXP(xp);
    const xpInLevel = xpWithinLevel(xp);
    const pct = (xpInLevel / XP_PER_LEVEL) * 100;
    const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] || 'Legend';
    const avatar = LEVEL_AVATARS[Math.min(level, LEVEL_AVATARS.length - 1)] || '🌌';

    const el = id => document.getElementById(id);
    if (el('eco-avatar'))       el('eco-avatar').textContent = avatar;
    if (el('eco-level-num'))    el('eco-level-num').textContent = level;
    if (el('eco-level-title'))  el('eco-level-title').textContent = title;

    // ✅ Streak from GamifySystem
    let streak = 0;
    if (typeof GamifySystem !== 'undefined' && GamifySystem.getState) {
      streak = GamifySystem.getState().streak;
    }
    if (el('eco-streak-num'))   el('eco-streak-num').textContent = streak;

    if (el('eco-xp-current'))   el('eco-xp-current').textContent = `${xpInLevel} XP`;
    if (el('eco-xp-next'))      el('eco-xp-next').textContent = `Next: ${XP_PER_LEVEL} XP`;
    if (el('eco-total-xp'))     el('eco-total-xp').textContent = xp;
    if (el('eco-completed-count')) el('eco-completed-count').textContent = state.completedTips.length;
    if (el('eco-tips-read'))    el('eco-tips-read').textContent = state.tipsRead || 0;

    const bar = el('eco-xp-bar');
    if (bar) {
      setTimeout(() => { bar.style.width = pct + '%'; }, 50);
    }

    const el2 = document.getElementById('eco-player-name');
    if (el2) {
      try {
        if (typeof getCurrentUser === 'function') {
          const user = getCurrentUser();
          if (user && user.name) el2.textContent = user.name.split(' ')[0];
        }
      } catch (e) {}
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Smart Daily Tip (unchanged)
  // ─────────────────────────────────────────────
  function renderSmartTip(state) {
    const tip = getTodaysTip();
    const el = id => document.getElementById(id);
    if (el('smart-tip-icon'))  el('smart-tip-icon').textContent = tip.icon;
    if (el('smart-tip-cat'))   el('smart-tip-cat').textContent = tip.category.charAt(0).toUpperCase() + tip.category.slice(1);
    if (el('smart-tip-title')) el('smart-tip-title').textContent = tip.title;
    if (el('smart-tip-desc'))  el('smart-tip-desc').textContent = tip.desc;
    const diffEl = el('smart-tip-diff');
    if (diffEl) {
      diffEl.textContent = tip.difficulty.charAt(0).toUpperCase() + tip.difficulty.slice(1);
      diffEl.className = 'tip-diff-tag ' + tip.difficulty;
    }
    const impactEl = el('smart-tip-impact');
    if (impactEl) {
      impactEl.innerHTML = `
        <span class="impact-pill"><i class="fas fa-cloud"></i> ${tip.co2} kg CO₂</span>
        <span class="impact-pill"><i class="fas fa-tint"></i> ${tip.water}L water</span>
        <span class="impact-pill"><i class="fas fa-bolt"></i> ${tip.energy} kWh</span>`;
    }
    const readBtn = el('smart-read-btn');
    if (readBtn) {
      const alreadyRead = state.lastReadDate === todayStr();
      if (alreadyRead) {
        readBtn.disabled = true;
        readBtn.innerHTML = '<i class="fas fa-check"></i> Already read today';
      } else {
        readBtn.disabled = false;
        readBtn.innerHTML = '<i class="fas fa-eye"></i> Mark as Read (+5 XP)';
      }
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Daily Challenge (unchanged)
  // ─────────────────────────────────────────────
  function renderChallenge(state) {
    const challenge = getTodaysChallenge(state);
    const challengeData = DAILY_CHALLENGES[challenge.idx];
    const el = id => document.getElementById(id);
    if (el('challenge-icon'))  el('challenge-icon').textContent = challengeData.icon;
    if (el('challenge-title')) el('challenge-title').textContent = challengeData.title;
    if (el('challenge-desc'))  el('challenge-desc').textContent = challengeData.desc;
    const progFill = el('challenge-prog-fill');
    const progText = el('challenge-prog-text');
    const claimBtn = el('challenge-claim-btn');
    const lockMsg  = el('challenge-lock-msg');
    if (challenge.claimed) {
      if (progFill) progFill.style.width = '100%';
      if (progText) progText.textContent = '1 / 1';
      if (claimBtn) { claimBtn.disabled = true; claimBtn.innerHTML = '<i class="fas fa-check"></i> Reward Claimed!'; }
      if (lockMsg)  { lockMsg.style.display = 'flex'; }
    } else if (challenge.done) {
      if (progFill) progFill.style.width = '100%';
      if (progText) progText.textContent = '1 / 1';
      if (claimBtn) { claimBtn.disabled = false; claimBtn.innerHTML = '🎉 Claim +30 XP Reward!'; }
      if (lockMsg)  lockMsg.style.display = 'none';
    } else {
      if (progFill) progFill.style.width = '0%';
      if (progText) progText.textContent = '0 / 1';
      if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = 'Complete Challenge to Claim'; }
      if (lockMsg)  lockMsg.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Impact Stats
  // ─────────────────────────────────────────────
  function renderImpact(state) {
    const el = id => document.getElementById(id);
    if (el('impact-co2'))    el('impact-co2').textContent = (state.impactCO2 || 0).toFixed(1);
    if (el('impact-water'))  el('impact-water').textContent = Math.round(state.impactWater || 0);
    if (el('impact-energy')) el('impact-energy').textContent = (state.impactEnergy || 0).toFixed(1);
  }

  // ─────────────────────────────────────────────
  // RENDER: Tip Cards Grid (with scaled XP)
  // ─────────────────────────────────────────────
  function renderTipCards(state, activeFilter) {
    const grid = document.getElementById('eco-tips-grid');
    if (!grid) return;

    grid.innerHTML = ECO_TIPS_DB.map(tip => {
      const completed = state.completedTips.includes(tip.id);
      const hidden    = activeFilter && activeFilter !== 'all' && tip.category !== activeFilter;
      const diffClass = tip.difficulty;
      const xpReward  = XP_COMPLETE_BY_DIFF[diffClass] || XP_COMPLETE;

      return `
        <div class="tip-card ${completed ? 'completed' : ''} ${hidden ? 'hidden' : ''}"
             data-tip-id="${tip.id}" data-cat="${tip.category}">
          <div class="tip-done-check"><i class="fas fa-check"></i></div>
          <div class="tip-card-top">
            <div class="tip-card-icon">${tip.icon}</div>
            <div class="tip-card-tags">
              <span class="tip-card-cat">${tip.category}</span>
              <span class="tip-card-diff ${diffClass}">${diffClass.charAt(0).toUpperCase() + diffClass.slice(1)}</span>
            </div>
          </div>
          <h4 class="tip-card-title">${tip.title}</h4>
          <p class="tip-card-desc">${tip.desc}</p>
          <div class="tip-card-impact">
            <span><i class="fas fa-cloud"></i>${tip.co2}kg CO₂</span>
            ${tip.water > 0 ? `<span><i class="fas fa-tint"></i>${tip.water}L</span>` : ''}
            ${tip.energy > 0 ? `<span><i class="fas fa-bolt"></i>${tip.energy}kWh</span>` : ''}
          </div>
          <div class="tip-card-footer">
            <div class="tip-xp-label"><i class="fas fa-star"></i> +${xpReward} XP</div>
            <button class="tip-complete-btn" data-tip-id="${tip.id}"
                    ${completed ? 'disabled' : ''}>
              ${completed
                ? '<i class="fas fa-check"></i> Done!'
                : '<i class="fas fa-leaf"></i> Complete'}
            </button>
          </div>
        </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // FULL RE-RENDER
  // ─────────────────────────────────────────────
  function renderAll(state, filter) {
    renderPlayerCard(state);
    renderSmartTip(state);
    renderChallenge(state);
    renderImpact(state);
    renderTipCards(state, filter || 'all');
  }

  // ─────────────────────────────────────────────
  // EVENT: Complete a tip (with scaled XP)
  // ─────────────────────────────────────────────
  function handleCompleteTip(tipId, event, state) {
    if (state.completedTips.includes(tipId)) return;
    const tip = ECO_TIPS_DB.find(t => t.id === tipId);
    if (!tip) return;

    state.completedTips.push(tipId);
    state.impactCO2    += tip.co2;
    state.impactWater  += tip.water;
    state.impactEnergy += tip.energy;

    const xpReward = XP_COMPLETE_BY_DIFF[tip.difficulty] || XP_COMPLETE;
    addXP(state, xpReward, 'Complete Tip', event);

    const challenge = state.challenge;
    if (challenge && !challenge.done && !challenge.claimed) {
      challenge.done = true;
    }

    saveState(state);
    renderAll(state, getActiveFilter());
    ecoToast('Tip Completed! ✅', `+${xpReward} XP earned · +${tip.co2} kg CO₂ saved`, tip.icon);
  }

  // ─────────────────────────────────────────────
  // EVENT: Read today's smart tip (unchanged)
  // ─────────────────────────────────────────────
  function handleReadSmartTip(event, state) {
    const today = todayStr();
    if (state.lastReadDate === today) {
      ecoToast('Already Read', 'You already read today\'s tip. Come back tomorrow!', '📖');
      return;
    }
    state.lastReadDate = today;
    state.tipsRead = (state.tipsRead || 0) + 1;
    addXP(state, XP_READ_TIP, 'Read Tip', event);
    saveState(state);
    renderAll(state, getActiveFilter());
    ecoToast('Tip Read! 📖', `+${XP_READ_TIP} XP — knowledge is power!`, '💡');
  }

  // ─────────────────────────────────────────────
  // EVENT: Claim challenge reward (unchanged)
  // ─────────────────────────────────────────────
  function handleClaimChallenge(event, state) {
    const challenge = state.challenge;
    if (!challenge || challenge.claimed || !challenge.done) return;
    challenge.claimed = true;
    addXP(state, XP_CHALLENGE, 'Daily Challenge', event);
    saveState(state);
    renderAll(state, getActiveFilter());
    ecoToast('Challenge Complete! 🏆', `+${XP_CHALLENGE} XP earned — incredible!`, '🎉');
    fireConfetti();
  }

  // ─────────────────────────────────────────────
  // FILTER helpers
  // ─────────────────────────────────────────────
  function getActiveFilter() {
    const active = document.querySelector('.eco-filter-btn.active');
    return active ? active.dataset.cat : 'all';
  }

  function applyFilter(cat) {
    document.querySelectorAll('.tip-card').forEach(card => {
      if (cat === 'all' || card.dataset.cat === cat) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  function init() {
    const state = loadState();
    // Streak is now handled by GamifySystem – no local streak processing
    saveState(state);

    renderAll(state, 'all');

    const grid = document.getElementById('eco-tips-grid');
    if (grid) {
      grid.addEventListener('click', function(e) {
        const btn = e.target.closest('.tip-complete-btn');
        if (!btn || btn.disabled) return;
        const tipId = btn.dataset.tipId;
        if (tipId) handleCompleteTip(tipId, e, state);
      });
    }

    const readBtn = document.getElementById('smart-read-btn');
    if (readBtn) {
      readBtn.addEventListener('click', function(e) {
        if (!readBtn.disabled) handleReadSmartTip(e, state);
      });
    }

    const claimBtn = document.getElementById('challenge-claim-btn');
    if (claimBtn) {
      claimBtn.addEventListener('click', function(e) {
        if (!claimBtn.disabled) handleClaimChallenge(e, state);
      });
    }

    const filterRow = document.querySelector('.eco-filter-row');
    if (filterRow) {
      filterRow.addEventListener('click', function(e) {
        const btn = e.target.closest('.eco-filter-btn');
        if (!btn) return;
        document.querySelectorAll('.eco-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter(btn.dataset.cat);
      });
    }

    window.EcoTips = {
      getState: () => state,
      addXP:    (amt, label, evt) => { addXP(state, amt, label, evt); saveState(state); renderPlayerCard(state); },
      onComplete: (tipId, evt) => handleCompleteTip(tipId, evt, state),
      refresh: () => renderAll(state, getActiveFilter()),
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

function updateEcoTipsForWeather(weatherCode) {
  if (window.EcoTips && window.EcoTips.refresh) {
    window.EcoTips.refresh();
  }
}
window.updateEcoTipsForWeather = updateEcoTipsForWeather;