// ═══════════════════════════════════════════════════════════════
// GAMIFICATION.JS — Eco Arena XP / Level / Challenge / Leaderboard
// ═══════════════════════════════════════════════════════════════

const GamifySystem = (function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────
  const STORAGE_PREFIX = 'clifix_gamify_';        // user-specific data
  const LEADERBOARD_KEY = 'clifix_global_leaderboard_v1'; // shared across all users

  const DAILY_LIMITED_ACTIONS = new Set(['view_report', 'check_aqi']);
  // (future actions can be added here)

  const XP_REWARDS = {
    daily_login:      { xp: 10,  label: 'Daily Login',        icon: '📅' },
    eco_action:       { xp: 20,  label: 'Eco Action Logged',  icon: '🌱' },
    view_report:      { xp: 15,  label: 'Climate Report',     icon: '📊' },
    check_aqi:        { xp: 5,   label: 'AQI Checked',        icon: '💨' },
    daily_challenge:  { xp: 50,  label: 'Daily Challenge',    icon: '⚡' },
    weekly_mission:   { xp: 150, label: 'Weekly Mission',     icon: '🌍' },
    invite_friend:    { xp: 100, label: 'Invited a Friend',   icon: '👥' },
    tree_planted:     { xp: 200, label: 'Tree Planted',       icon: '🌳' },
  };

  const LEVEL_TITLES = [
    '', 'Seedling', 'Sprout', 'Sapling', 'Eco Starter', 'Green Advocate',
    'Eco Warrior', 'Nature Guardian', 'Earth Defender', 'Climate Champion',
    'Planet Hero', 'Legendary Eco', 'Global Guardian', 'Planetary Legend'
  ];

  const GAM_BADGES = [
    { id: 'first_xp',   name: 'First XP',      desc: 'Earn your first XP',      icon: '⭐', color: 'rgba(0,230,118,0.15)', condition: s => s.totalXP >= 1 },
    { id: 'streak3',    name: '3-Day Fire',     desc: '3-day login streak',      icon: '🔥', color: 'rgba(255,87,34,0.15)',  condition: s => s.streak >= 3 },
    { id: 'streak7',    name: 'Week Warrior',   desc: '7-day login streak',      icon: '💪', color: 'rgba(255,87,34,0.2)',   condition: s => s.streak >= 7 },
    { id: 'lvl5',       name: 'Level 5',        desc: 'Reach level 5',           icon: '🏅', color: 'rgba(255,179,0,0.15)', condition: s => levelFromXP(s.totalXP) >= 5 },
    { id: 'lvl10',      name: 'Planet Hero',    desc: 'Reach level 10',          icon: '🏆', color: 'rgba(255,179,0,0.25)', condition: s => levelFromXP(s.totalXP) >= 10 },
    { id: 'xp500',      name: '500 Club',       desc: 'Earn 500 total XP',       icon: '⚡', color: 'rgba(41,182,246,0.15)', condition: s => s.totalXP >= 500 },
    { id: 'xp1000',     name: 'XP Legend',      desc: 'Earn 1,000 total XP',     icon: '💎', color: 'rgba(0,230,118,0.2)', condition: s => s.totalXP >= 1000 },
    { id: 'chall5',     name: 'Challenger',     desc: 'Complete 5 challenges',   icon: '🎯', color: 'rgba(0,230,118,0.12)', condition: s => s.challengesCompleted >= 5 },
    { id: 'chall20',    name: 'Elite Eco',      desc: 'Complete 20 challenges',  icon: '🌟', color: 'rgba(255,215,0,0.2)',  condition: s => s.challengesCompleted >= 20 },
  ];

  const DAILY_CHALLENGE_POOL = [
    { id: 'dc_bike',      title: 'Cycle to Destination',     desc: 'Log a bike trip today',              icon: '🚲', xp: 50, target: 1, actionKey: 'bike' },
    { id: 'dc_veg',       title: 'Go Vegetarian',            desc: 'Log a vegetarian meal',              icon: '🥦', xp: 50, target: 1, actionKey: 'vegetarian' },
    { id: 'dc_shower',    title: 'Short Shower',             desc: 'Keep your shower under 5 min',       icon: '🚿', xp: 50, target: 1, actionKey: 'shortShower' },
    { id: 'dc_recycle',   title: 'Recycle Something',        desc: 'Log a recycling action',             icon: '♻️', xp: 50, target: 1, actionKey: 'recycle' },
    { id: 'dc_transit',   title: 'Public Transport',         desc: 'Use a bus, train, or subway',        icon: '🚌', xp: 50, target: 1, actionKey: 'publicTransport' },
    { id: 'dc_reusable',  title: 'Go Reusable',              desc: 'Use a reusable bag or bottle',       icon: '🛍️', xp: 50, target: 1, actionKey: 'reusable' },
    { id: 'dc_coldwash',  title: 'Cold Wash Laundry',        desc: 'Wash at 30°C or below',              icon: '👕', xp: 50, target: 1, actionKey: 'coldWash' },
  ];

  const WEEKLY_MISSION_POOL = [
    { id: 'wm_7veg',      title: '7 Veggie Meals',     desc: 'Log 7 vegetarian meals this week',   icon: '🥗', xp: 150, target: 7, actionKey: 'vegetarian' },
    { id: 'wm_5bike',     title: '5 Bike Trips',       desc: 'Cycle instead of driving 5 times',   icon: '🚲', xp: 150, target: 5, actionKey: 'bike' },
    { id: 'wm_7shower',   title: 'Short Shower Week',  desc: 'Take 7 short showers this week',     icon: '🚿', xp: 150, target: 7, actionKey: 'shortShower' },
    { id: 'wm_10recycle', title: 'Recycle 10 Items',   desc: 'Recycle 10 times this week',         icon: '♻️', xp: 150, target: 10, actionKey: 'recycle' },
    { id: 'wm_3solar',    title: 'Solar Power Days',   desc: 'Use solar power 3 times this week',  icon: '☀️', xp: 150, target: 3, actionKey: 'solar' },
  ];

  // ── State ───────────────────────────────────────────────────────
  let state = {
    totalXP: 0,
    todayXP: 0,
    todayActions: 0,
    streak: 0,
    lastLoginDate: null,
    loginDates: [],
    badgesUnlocked: [],
    challengesCompleted: 0,
    dailyChallenges: [],
    weeklyMissions: [],
    leaderboardTab: 'global',
    dailyActions: {},          // { '2026-04-29': { view_report: true } }
    toastContainer: null,
  };

  // ── Dynamic Storage Key ─────────────────────────────────────────
  function getStorageKey() {
    if (typeof getCurrentUser !== 'function') {
      console.warn('GamifySystem: getCurrentUser() is not defined.');
      return STORAGE_PREFIX + 'anonymous';
    }
    const user = getCurrentUser();
    if (!user || !user._id) {
      console.warn('GamifySystem: No user _id found. Data will not be saved.');
      return null;
    }
    return `${STORAGE_PREFIX}${user._id}`;
  }

  // ── XP / Level Maths ───────────────────────────────────────────
  function xpForLevel(n) {
    if (n <= 1) return 0;
    return Math.floor(100 * Math.pow(n - 1, 1.7));
  }

  function levelFromXP(xp) {
    let lvl = 1;
    while (xpForLevel(lvl + 1) <= xp) lvl++;
    if (lvl > 13) lvl = 13;
    return lvl;
  }

  function getLevelTitle(lvl) {
    return LEVEL_TITLES[Math.min(lvl, LEVEL_TITLES.length - 1)] || 'Legend';
  }

  function xpProgressInLevel(xp) {
    const lvl = levelFromXP(xp);
    const current = xp - xpForLevel(lvl);
    const needed  = xpForLevel(lvl + 1) - xpForLevel(lvl);
    return { current, needed, pct: needed > 0 ? (current / needed) * 100 : 100 };
  }

  // ── Persistence (per‑user) ──────────────────────────────────────
  function getDefaultState() {
    return {
      totalXP: 0,
      todayXP: 0,
      todayActions: 0,
      streak: 0,
      lastLoginDate: null,
      loginDates: [],
      badgesUnlocked: [],
      challengesCompleted: 0,
      dailyChallenges: [],
      weeklyMissions: [],
      leaderboardTab: 'global',
      dailyActions: {},
      toastContainer: null,
    };
  }

  function loadState() {
    const storageKey = getStorageKey();
    if (!storageKey) {
      state = getDefaultState();
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        state = { ...getDefaultState(), ...saved };
      } else {
        state = getDefaultState();
      }
    } catch (e) {
      console.error('GamifySystem: Failed to load state', e);
      state = getDefaultState();
    }
    _ensureDailyChallenges();
    _ensureWeeklyMissions();
    _updateLoginStreak();
  }

  function saveState() {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        totalXP: state.totalXP,
        todayXP: state.todayXP,
        todayActions: state.todayActions,
        streak: state.streak,
        lastLoginDate: state.lastLoginDate,
        loginDates: state.loginDates,
        badgesUnlocked: state.badgesUnlocked,
        challengesCompleted: state.challengesCompleted,
        dailyChallenges: state.dailyChallenges,
        weeklyMissions: state.weeklyMissions,
        dailyActions: state.dailyActions,   // include daily limits
      }));
    } catch (e) {
      console.error('GamifySystem: Failed to save state', e);
    }
  }

  // ── Shared Global Leaderboard ───────────────────────────────────
  function getGlobalLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveGlobalLeaderboard(board) {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
    } catch (e) {
      console.error('GamifySystem: Failed to save global leaderboard', e);
    }
  }

  /** Updates (or inserts) the current user's entry in the shared leaderboard. */
  function updateGlobalLeaderboardEntry() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (!user || !user._id) return;

    const board = getGlobalLeaderboard();
    const entryIndex = board.findIndex(e => e.id === user._id);

    const newEntry = {
      id: user._id,
      name: user.name || 'Unknown',
      xp: state.totalXP,
      level: levelFromXP(state.totalXP),
    };

    if (entryIndex !== -1) {
      board[entryIndex] = newEntry;
    } else {
      board.push(newEntry);
    }

    // Sort descending by XP
    board.sort((a, b) => b.xp - a.xp);
    saveGlobalLeaderboard(board);
  }

  // ── Login Streak & Challenge Generation ────────────────────────
  function _todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function _updateLoginStreak() {
    const today = _todayStr();
    if (state.lastLoginDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (state.lastLoginDate === yStr) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.lastLoginDate && state.lastLoginDate !== today) {
      state.streak = 1;
    } else if (!state.lastLoginDate) {
      state.streak = 1;
    }
    state.lastLoginDate = today;

    if (!state.loginDates.includes(today)) {
      state.loginDates.push(today);
      state.loginDates = state.loginDates.slice(-7);
    }
    saveState();
  }

  function _ensureDailyChallenges() {
    const today = _todayStr();
    if (state.dailyChallenges.length && state.dailyChallenges[0]?.date === today) return;
    const seed = parseInt(today.replace(/-/g, '')) % DAILY_CHALLENGE_POOL.length;
    const picks = [];
    for (let i = 0; i < 3; i++) {
      picks.push(DAILY_CHALLENGE_POOL[(seed + i) % DAILY_CHALLENGE_POOL.length]);
    }
    const smartChallenge = _getSmartChallenge();
    if (smartChallenge && picks.length >= 3) picks[picks.length - 1] = smartChallenge;
    state.dailyChallenges = picks.map(c => ({ ...c, progress: 0, completed: false, date: today }));
  }

  function _ensureWeeklyMissions() {
    const weekStart = _getWeekStart();
    if (state.weeklyMissions.length && state.weeklyMissions[0]?.weekStart === weekStart) return;
    const seed = parseInt(weekStart.replace(/-/g, '')) % WEEKLY_MISSION_POOL.length;
    const picks = [];
    for (let i = 0; i < 3; i++) {
      picks.push(WEEKLY_MISSION_POOL[(seed + i) % WEEKLY_MISSION_POOL.length]);
    }
    state.weeklyMissions = picks.map(m => ({ ...m, progress: 0, completed: false, weekStart }));
  }

  function _getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  }

  function _getSmartChallenge() {
    const aqi = typeof aqiValue !== 'undefined' ? aqiValue : 0;
    const temp = (typeof currentWeatherData !== 'undefined' && currentWeatherData)
      ? Math.round(currentWeatherData.current_weather?.temperature || 0)
      : 0;
    if (aqi > 100) {
      return {
        id: 'dc_smart_aqi', title: '😷 Air Quality Alert',
        desc: `AQI is ${aqi}. Limit outdoor activity & mask up`,
        icon: '😷', xp: 60, target: 1, actionKey: null, smart: true
      };
    }
    if (temp > 32) {
      return {
        id: 'dc_smart_heat', title: '🥵 Heat Day Saver',
        desc: `It's ${temp}°C! Reduce AC or cool naturally`,
        icon: '❄️', xp: 55, target: 1, actionKey: null, smart: true
      };
    }
    if (temp < 10) {
      return {
        id: 'dc_smart_cold', title: '🧥 Layer Up, Save Energy',
        desc: `${temp}°C outside. Layer clothing instead of heating`,
        icon: '🧥', xp: 55, target: 1, actionKey: null, smart: true
      };
    }
    return null;
  }

  // ── XP Earning (with daily‑limit check) ────────────────────────
  function earnXP(type, overrideAmount) {
    // ✅ BUG #2 FIX: Check daily limit for certain actions
    if (DAILY_LIMITED_ACTIONS.has(type)) {
      const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
      if (!user) return; // must be logged in

      const today = _todayStr();
      // Initialize dailyActions for today if needed
      if (!state.dailyActions[today]) {
        state.dailyActions[today] = {};
      }

      if (state.dailyActions[today][type]) {
        // Already claimed today – do nothing (optionally show toast)
        _showGamToast('⏳ Already Claimed', `You already earned XP for ${XP_REWARDS[type]?.label || type} today.`);
        return 0;
      }

      // Mark as claimed
      state.dailyActions[today][type] = true;
      saveState(); // persist immediately so a page refresh doesn't reset the lock
    }

    const reward = XP_REWARDS[type];
    const amount = overrideAmount || (reward ? reward.xp : 10);
    const label  = reward ? reward.label : type;
    const icon   = reward ? reward.icon : '✨';

    const prevLevel = levelFromXP(state.totalXP);
    state.totalXP   += amount;
    state.todayXP   += amount;

    saveState();
    _showXPFloat(amount);
    _checkBadges();

    const newLevel = levelFromXP(state.totalXP);
    if (newLevel > prevLevel) {
      setTimeout(() => _showLevelUp(newLevel), 600);
    }

    _showGamToast(icon + ' +' + amount + ' XP', label);

    // ✅ BUG #1 FIX: Update global leaderboard after XP change
    updateGlobalLeaderboardEntry();

    renderAll();
    return amount;
  }

  // ── Challenge Completion ────────────────────────────────────────
  function completeChallenge(id, isWeekly) {
    const list = isWeekly ? state.weeklyMissions : state.dailyChallenges;
    const ch = list.find(c => c.id === id);
    if (!ch || ch.completed) return;

    ch.progress = ch.target;
    ch.completed = true;
    state.challengesCompleted++;

    const xpType = isWeekly ? 'weekly_mission' : 'daily_challenge';
    earnXP(xpType, ch.xp);
    saveState();
    renderAll();
  }

  function onEcoAction(actionKey) {
    let changed = false;
    state.dailyChallenges.forEach(ch => {
      if (!ch.completed && ch.actionKey === actionKey && ch.progress < ch.target) {
        ch.progress++;
        changed = true;
        if (ch.progress >= ch.target) {
          ch.completed = true;
          state.challengesCompleted++;
          _showGamToast('⚡ Challenge Complete!', ch.title + ' — +' + ch.xp + ' XP bonus');
          earnXP('daily_challenge', ch.xp);
        }
      }
    });
    state.weeklyMissions.forEach(m => {
      if (!m.completed && m.actionKey === actionKey && m.progress < m.target) {
        m.progress++;
        changed = true;
        if (m.progress >= m.target) {
          m.completed = true;
          state.challengesCompleted++;
          _showGamToast('🌍 Mission Complete!', m.title + ' — +' + m.xp + ' XP bonus');
          earnXP('weekly_mission', m.xp);
        }
      }
    });
    if (changed) {
      state.todayActions++;
      earnXP('eco_action');
      saveState();
    }
  }

  // ── Badge Checks ────────────────────────────────────────────────
  function _checkBadges() {
    GAM_BADGES.forEach(b => {
      if (!state.badgesUnlocked.includes(b.id) && b.condition(state)) {
        state.badgesUnlocked.push(b.id);
        _showGamToast('🏅 Badge Unlocked!', b.name);
        const el = document.getElementById('gam-badge-' + b.id);
        if (el) {
          el.classList.remove('gam-locked');
          el.classList.add('gam-unlocked', 'gam-just-unlocked');
        }
        saveState();
      }
    });
  }

  // ── Render Functions ────────────────────────────────────────────
  function renderAll() {
    _renderLevelCard();
    _renderStreak();
    _renderTodayCard();
    _renderDailyChallenges();
    _renderWeeklyMissions();
    _renderLeaderboard(state.leaderboardTab);
    _renderBadges();
    _renderNotifStrip();
  }

  function _renderLevelCard() {
    const lvl  = levelFromXP(state.totalXP);
    const prog = xpProgressInLevel(state.totalXP);
    const title = getLevelTitle(lvl);
    _setText('gam-level-num',   lvl);
    _setText('gam-level-title', title);
    _setText('gam-xp-current',  prog.current.toLocaleString());
    _setText('gam-xp-next',     prog.needed.toLocaleString());
    _setText('gam-total-xp',    state.totalXP.toLocaleString());

    const fill = document.getElementById('gam-ring-fill');
    if (fill) {
      const offset = 327 - (327 * (prog.pct / 100));
      fill.style.strokeDashoffset = offset;
    }
    const bar = document.getElementById('gam-xp-bar-fill');
    if (bar) bar.style.width = Math.min(prog.pct, 100) + '%';

    const loginBtn = document.getElementById('gam-daily-login-btn');
    if (loginBtn) {
      const today = _todayStr();
      const alreadyClaimed = state.dailyChallenges.some(c => c.id === 'dc_login_' + today);
      loginBtn.disabled = alreadyClaimed;
      loginBtn.textContent = alreadyClaimed ? '✅ Logged in today' : '📅 Daily Login +10 XP';
    }
  }

  function _renderStreak() {
    _setText('gam-streak-num', '🔥 ' + state.streak);
    const note = document.getElementById('gam-streak-note');
    if (note) {
      if (state.streak === 0) note.textContent = 'Log in daily to build your streak!';
      else if (state.streak < 7)  note.textContent = state.streak + '-day streak! Keep it up.';
      else note.textContent = '🌟 Amazing ' + state.streak + '-day streak!';
    }
    const calWrap = document.getElementById('gam-cal-week');
    if (!calWrap) return;
    const today = new Date();
    const days  = ['S','M','T','W','T','F','S'];
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const isActive = state.loginDates.includes(dStr);
      const isToday  = i === 0;
      html += `
        <div class="gam-cal-dot ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}">
          <div class="gam-cal-dot-circle">${isActive ? '✓' : ''}</div>
          <div class="gam-cal-dot-day">${days[d.getDay()]}</div>
        </div>`;
    }
    calWrap.innerHTML = html;
  }

  function _renderTodayCard() {
    _setText('gam-today-xp',      state.todayXP);
    _setText('gam-today-actions', state.todayActions);
    // Use global leaderboard to calculate rank
    const board = getGlobalLeaderboard();
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const userId = user?._id;
    const rank = board.findIndex(e => e.id === userId);
    _setText('gam-today-rank', rank >= 0 ? '#' + (rank + 1) : '#--');
    const toNext = xpForLevel(levelFromXP(state.totalXP) + 1) - state.totalXP;
    _setText('gam-xp-to-next', Math.max(0, toNext).toLocaleString());
  }

  function _renderDailyChallenges() {
    const wrap = document.getElementById('gam-daily-challenges');
    if (!wrap) return;
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    const hh = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    _setText('gam-daily-timer', `Resets in ${hh}:${mm}:${ss}`);

    wrap.innerHTML = state.dailyChallenges.map(ch => `
      <div class="gam-challenge-item ${ch.completed ? 'completed' : ''}" id="gam-ch-${ch.id}">
        <div class="gam-ch-icon">${ch.icon}</div>
        <div class="gam-ch-body">
          <div class="gam-ch-title">
            ${ch.title}
            ${ch.smart ? '<span class="gam-smart-tag">⚡ Smart</span>' : ''}
          </div>
          <div class="gam-ch-desc">${ch.desc}</div>
          <div class="gam-ch-progress-wrap">
            <div class="gam-ch-progress-track">
              <div class="gam-ch-progress-fill" style="width:${(ch.progress / ch.target) * 100}%"></div>
            </div>
            <span class="gam-ch-progress-text">${ch.progress}/${ch.target}</span>
          </div>
        </div>
        <div class="gam-ch-right">
          <div class="gam-ch-xp">+${ch.xp} XP</div>
          ${ch.completed
            ? '<div class="gam-ch-complete-badge">✅ Done</div>'
            : ch.actionKey
              ? `<button class="gam-ch-btn" onclick="GamifySystem.completeChallenge('${ch.id}', false)">
                   Complete
                 </button>`
              : `<button class="gam-ch-btn" onclick="GamifySystem.completeChallenge('${ch.id}', false)">
                   ✔ Mark Done
                 </button>`
          }
        </div>
      </div>
    `).join('');
  }

  function _renderWeeklyMissions() {
    const wrap = document.getElementById('gam-weekly-missions');
    if (!wrap) return;
    wrap.innerHTML = state.weeklyMissions.map(m => `
      <div class="gam-challenge-item ${m.completed ? 'completed' : ''}" id="gam-wm-${m.id}">
        <div class="gam-ch-icon">${m.icon}</div>
        <div class="gam-ch-body">
          <div class="gam-ch-title">${m.title}</div>
          <div class="gam-ch-desc">${m.desc}</div>
          <div class="gam-ch-progress-wrap">
            <div class="gam-ch-progress-track">
              <div class="gam-ch-progress-fill" style="width:${Math.min((m.progress / m.target) * 100, 100)}%"></div>
            </div>
            <span class="gam-ch-progress-text">${m.progress}/${m.target}</span>
          </div>
        </div>
        <div class="gam-ch-right">
          <div class="gam-ch-xp">+${m.xp} XP</div>
          ${m.completed
            ? '<div class="gam-ch-complete-badge">✅ Done</div>'
            : `<button class="gam-ch-btn" onclick="GamifySystem.completeChallenge('${m.id}', true)" ${m.progress >= m.target ? '' : 'disabled'}>
                 ${m.progress >= m.target ? '🎉 Claim' : 'In Progress'}
               </button>`
          }
        </div>
      </div>
    `).join('');
  }

  // ✅ NEW: Leaderboard now uses shared global data
  function _renderLeaderboard(tab) {
    state.leaderboardTab = tab;

    // Always use the true shared leaderboard (both tabs show the same data)
    const board = getGlobalLeaderboard();
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const currentUserId = user?._id;

    // Update tab buttons
    document.querySelectorAll('.gam-lb-tab').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().toLowerCase().replace(' ', '') === (tab === 'weekly' ? 'thisweek' : 'global'));
    });

    // Podium (top 3)
    const podiumWrap = document.getElementById('gam-lb-podium');
    const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
    const podiumEmojis = ['🥈', '🥇', '🥉'];
    const podiumHeights = ['60px', '80px', '50px'];
    if (podiumWrap && board.length >= 3) {
      podiumWrap.innerHTML = podiumOrder.map((idx, slot) => {
        const u = board[idx] || { name: '---', xp: 0, level: 1, id: '' };
        const initials = (u.name || '?').slice(0, 2).toUpperCase();
        return `
          <div class="gam-podium-slot">
            <div class="gam-podium-avatar">${initials}</div>
            <div class="gam-podium-name">${u.name}</div>
            <div class="gam-podium-xp">${u.xp.toLocaleString()} XP</div>
            <div class="gam-podium-block" style="height:${podiumHeights[slot]}">${podiumEmojis[slot]}</div>
          </div>`;
      }).join('');
    } else if (podiumWrap) {
      podiumWrap.innerHTML = '<div style="color:#8FAD8A;text-align:center;padding:20px;">Not enough players yet</div>';
    }

    // Ranked list (4th onward)
    const listWrap = document.getElementById('gam-lb-list');
    if (listWrap) {
      const startIdx = 3;
      const displayBoard = board.slice(startIdx, 10);
      listWrap.innerHTML = displayBoard.map((u, i) => {
        const initials = (u.name || '?').slice(0, 2).toUpperCase();
        const isMe = u.id === currentUserId;
        return `
          <div class="gam-lb-row ${isMe ? 'is-me' : ''}">
            <div class="gam-lb-rank">${startIdx + i + 1}</div>
            <div class="gam-lb-avatar-sm">${initials}</div>
            <div class="gam-lb-username">${u.name}${isMe ? ' (You)' : ''}</div>
            <div class="gam-lb-level-badge">Lv.${u.level}</div>
            <div class="gam-lb-xp-val">${u.xp.toLocaleString()}</div>
          </div>`;
      }).join('');
    }

    // My rank display
    const myRank = document.getElementById('gam-my-rank');
    if (myRank && user) {
      const pos = board.findIndex(u => u.id === currentUserId);
      if (pos >= 0) {
        myRank.textContent = `You're ranked #${pos + 1} globally with ${state.totalXP.toLocaleString()} XP`;
        myRank.style.display = 'block';
      } else {
        myRank.textContent = 'Earn XP to appear on the leaderboard!';
        myRank.style.display = 'block';
      }
    } else if (myRank) {
      myRank.textContent = 'Log in to see your rank';
    }
  }

  function _renderBadges() {
    const wrap = document.getElementById('gam-badges-grid');
    if (!wrap) return;
    wrap.innerHTML = GAM_BADGES.map(b => {
      const unlocked = state.badgesUnlocked.includes(b.id);
      return `
        <div class="gam-badge-item ${unlocked ? 'gam-unlocked' : 'gam-locked'}" id="gam-badge-${b.id}" title="${b.desc}">
          ${!unlocked ? '<i class="fas fa-lock gam-lock-icon"></i>' : ''}
          <div class="gam-badge-icon" style="background:${b.color}">${b.icon}</div>
          <div class="gam-badge-name">${b.name}</div>
          <div class="gam-badge-desc">${b.desc}</div>
        </div>`;
    }).join('');
  }

  function _renderNotifStrip() {
    const strip = document.getElementById('gam-notif-strip');
    if (!strip) return;
    const notifs = [];
    const lvl  = levelFromXP(state.totalXP);
    const prog = xpProgressInLevel(state.totalXP);
    if (prog.pct >= 80) notifs.push(`⚡ Almost Level ${lvl + 1}! Only ${prog.needed - prog.current} XP to go.`);
    if (state.streak >= 6) notifs.push('🔥 Incredible! 1 more day for a week-long streak.');
    if (state.streak > 0 && state.lastLoginDate !== _todayStr()) notifs.push('⚠️ Streak at risk! Log in today to keep it alive.');
    const pendingDaily = state.dailyChallenges.filter(c => !c.completed).length;
    if (pendingDaily > 0) notifs.push(`🎯 ${pendingDaily} daily challenge${pendingDaily > 1 ? 's' : ''} awaiting you!`);
    strip.innerHTML = notifs.slice(0, 3).map(n => `
      <div class="gam-notif-pill">
        <div class="gam-notif-dot"></div>
        ${n}
      </div>`).join('');
  }

  // ── Timers ──────────────────────────────────────────────────────
  function _startTimers() {
    setInterval(() => _renderDailyChallenges(), 1000);
  }

  // ── Animations ──────────────────────────────────────────────────
  function _showXPFloat(amount) {
    const el = document.createElement('div');
    el.className = 'gam-xp-float';
    el.textContent = '+' + amount + ' XP';
    el.style.left  = (40 + Math.random() * 30) + '%';
    el.style.top   = (30 + Math.random() * 20) + '%';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function _showLevelUp(newLevel) {
    const overlay = document.getElementById('gam-levelup-overlay');
    const sub     = document.getElementById('gam-levelup-sub');
    if (!overlay) return;
    if (sub) sub.textContent = 'You reached Level ' + newLevel + ' — ' + getLevelTitle(newLevel) + '!';
    overlay.classList.add('active');
  }

  function closeLevelUp() {
    document.getElementById('gam-levelup-overlay')?.classList.remove('active');
  }

  function _showGamToast(title, msg) {
    let container = document.getElementById('gam-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'gam-toast-container';
      container.id = 'gam-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'gam-toast';
    toast.innerHTML = `
      <div class="gam-toast-icon">🌿</div>
      <div class="gam-toast-body">
        <div class="gam-toast-title">${title}</div>
        <div class="gam-toast-msg">${msg}</div>
      </div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  function _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Public API ──────────────────────────────────────────────────
  function resetAndReload() {
    console.log('GamifySystem: Resetting state for new user.');
    state = getDefaultState();
    loadState();
    // Re‑render everything with the current user's data
    renderAll();
  }

  function init() {
    loadState();
    renderAll();
    _startTimers();

    const originalLog = window.logEcoAction;
    window.logEcoAction = function (type) {
      if (typeof originalLog === 'function') originalLog(type);
      onEcoAction(type);
    };

    console.log('🎮 GamifySystem initialized for user:', getCurrentUser()?._id);
  }

  return {
    init,
    resetAndReload,
    renderAll,
    earnXP,
    completeChallenge,
    onEcoAction,
    switchLeaderboard: (tab) => _renderLeaderboard(tab),
    closeLevelUp,
    getState: () => state,
    levelFromXP,
    xpForLevel,
  };
})();

// ── Auto‑init when DOM is ready ────────────────────────────────────
(function () {
  function tryInit() {
    if (document.getElementById('gam-level-num') && typeof getCurrentUser !== 'undefined') {
      GamifySystem.init();
    } else {
      setTimeout(tryInit, 600);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    setTimeout(tryInit, 200);
  }
})();

window.GamifySystem = GamifySystem;