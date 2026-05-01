// ═══════════════════════════════════════════════════════
// ECO TRACKER & CARBON CALCULATOR
// ═══════════════════════════════════════════════════════

function showToast(title, message) {
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `<div class="toast-icon">🏆</div><div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 100);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 3500);
}

// Helper to check and unlock achievements
function updateAchievements(state) {
  const totalActions = Object.values(state.actions).reduce((sum, a) => sum + a.count, 0);
  const totalPoints = Object.values(state.actions).reduce((sum, a) => sum + a.count * a.points, 0);
  const totalCO2 = state.stats.carbonSaved;
  const treesPlanted = state.stats.treesSaved;
  const streak = state.user.streak;

  const conditions = {
    starter: totalActions >= 1,
    champion: totalActions >= 50,
    hero: totalCO2 >= 1000,
    streak7: streak >= 7,
    streak30: streak >= 30,
    water500: state.stats.waterSaved >= 500,
    trees10: treesPlanted >= 10,
    pts1000: totalPoints >= 1000
  };

  let newlyUnlocked = false;
  state.achievements.forEach(ach => {
    if (!ach.unlocked && conditions[ach.id]) {
      ach.unlocked = true;
      newlyUnlocked = true;
      showToast('🏆 Achievement Unlocked!', ach.name + ' — ' + ach.desc);
    }
  });
  return newlyUnlocked;
}

async function logAction(type, user) {
  if (!currentState || !user) return;

  try {
    const token = localStorage.getItem('clixfix_token');
    const res = await fetch(`${API_BASE}/api/user/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ actionType: type })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to log action');

    currentState.user.streak = data.streak;
    currentState.stats.carbonSaved = data.carbonSaved;
    currentState.stats.treesSaved = data.treesPlanted;

    const action = ECO_ACTIONS[type];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    currentState.history.unshift({
      date: `Today · ${timeStr}`,
      action: type,
      desc: `${action.name} — saved ${action.co2}kg CO₂ · +${action.points} pts`,
      icon: action.icon
    });
    currentState.history = currentState.history.slice(0, 10);

    if (!currentState.actions[type]) {
      currentState.actions[type] = { ...action, count: 0 };
    }
    currentState.actions[type].count++;

    currentState.stats.energySaved += action.energy || 0;
    currentState.stats.waterSaved += action.water || 0;

    if (currentState.challenge && currentState.challenge.action === type) {
      currentState.challenge.current = Math.min(currentState.challenge.current + 1, currentState.challenge.target);
    }

    const totalPoints = Object.values(currentState.actions).reduce((s, a) => s + a.count * a.points, 0);
    currentState.stats.greenScore = Math.min(Math.round((totalPoints / 1000) * 100), 100);

    updateAchievements(currentState);

    renderTracker(currentState, user);
    if (typeof refreshAIInsights === 'function') refreshAIInsights();
    
    showToast('✅ Action Logged!', `+${action.points} points · Saved ${action.co2}kg CO₂`);
  } catch (err) {
    console.error(err);
    showToast('Error', 'Could not log action. Please try again.');
  }
}

window.logEcoAction = function (type) {
  const user = getCurrentUser();
  if (user && currentState) logAction(type, user);
};

// ─────────────────────────────────────────────────
// Weekly challenge rotation – new every Monday
// ─────────────────────────────────────────────────
function getWeeklyChallenge() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const mondayStr = monday.toISOString().split('T')[0]; // e.g. "2026-04-27"
  const seed = parseInt(mondayStr.replace(/-/g, '')) % WEEK_CHALLENGES.length;
  const challenge = WEEK_CHALLENGES[seed];
  return { ...challenge, current: 0, claimed: false };
}

function renderTracker(state, user) {
  if (!state || !user) return;

  document.getElementById('carbon-saved').textContent = state.stats.carbonSaved.toFixed(1) + ' kg';
  document.getElementById('carbon-equiv').textContent = `≈ ${state.stats.treesSaved} trees`;
  document.getElementById('energy-saved').textContent = state.stats.energySaved.toFixed(1) + ' kWh';
  document.getElementById('energy-equiv').textContent = `≈ ${Math.floor(state.stats.energySaved * 0.5)} days of TV`;
  document.getElementById('water-saved').textContent = state.stats.waterSaved.toFixed(0) + ' L';
  document.getElementById('water-equiv').textContent = `≈ ${Math.floor(state.stats.waterSaved / 65)} showers`;

  const score = state.stats.greenScore;
  document.getElementById('green-score').textContent = score;
  const offset = 364 - (364 * score / 100);
  const ring = document.getElementById('score-ring');
  if (ring) ring.style.strokeDashoffset = offset;
  document.getElementById('score-subtext').textContent =
    score > 70 ? '🌟 Outstanding eco impact!' :
    score > 40 ? '✅ Keep going! You\'re doing great.' :
    'Start logging actions to grow your score.';

  const totalPoints = Object.values(state.actions).reduce((s, a) => s + a.count * a.points, 0);
  document.getElementById('total-points').textContent = totalPoints.toLocaleString();
  document.getElementById('streak-count').textContent = `${state.user.streak}-day streak`;
  document.getElementById('streak-badge').innerHTML = `🔥 ${state.user.streak}-day streak`;

  const rank = totalPoints >= 2000 ? 'gold' : totalPoints >= 500 ? 'silver' : 'bronze';
  const rankNames = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
  const rankEl = document.getElementById('rank-badge');
  rankEl.textContent = rankNames[rank];
  rankEl.className = `eco-badge ${rank}`;

  const treeBadge = document.getElementById('tree-badge');
  if (treeBadge) treeBadge.textContent = `🌳 ${state.stats.treesSaved} trees`;

  // Weekly challenge (already rotated by getWeeklyChallenge)
  const challenge = state.challenge;
  const pct = Math.min((challenge.current / challenge.target) * 100, 100);
  document.getElementById('challenge-description').textContent = challenge.description;
  document.getElementById('challenge-progress').style.width = pct + '%';
  document.getElementById('challenge-current').textContent = challenge.current;
  document.getElementById('challenge-target').textContent = challenge.target;
  
  const claimBtn = document.getElementById('claim-reward-btn');
  if (challenge.current >= challenge.target && !challenge.claimed) {
    claimBtn.disabled = false;
    claimBtn.textContent = '🎉 Claim Reward!';
  } else if (challenge.claimed) {
    claimBtn.disabled = true;
    claimBtn.textContent = '✅ Reward Claimed!';
  } else {
    claimBtn.disabled = true;
    claimBtn.textContent = 'Complete Challenge to Claim Reward';
  }

  // Actions grid
  const ag = document.getElementById('actions-grid');
  if (ag) {
    ag.innerHTML = Object.entries(ECO_ACTIONS).map(([key, action]) => {
      const loggedAction = state.actions[key];
      const count = loggedAction ? loggedAction.count : 0;
      return `
        <div class="action-card" onclick="window.logEcoAction('${key}')">
          <i class="fas fa-${action.icon}"></i>
          <h4>${action.name}</h4>
          <p>${action.desc}</p>
          <span class="action-pts">+${action.points} pts · ×${count}</span>
        </div>
      `;
    }).join('');
  }

  // Achievements grid
  const achg = document.getElementById('achievements-grid');
  if (achg) {
    achg.innerHTML = state.achievements.map(a => `
      <div class="achievement-item ${a.unlocked ? 'unlocked' : ''}">
        <div class="ach-icon ${a.unlocked ? '' : 'locked'}"><i class="fas fa-${a.icon}"></i></div>
        <div>
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
      </div>
    `).join('');
  }

  // Timeline history
  const tl = document.getElementById('timeline');
  if (tl) {
    tl.innerHTML = state.history.length
      ? state.history.map(h => `
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div class="tl-date">${h.date}</div>
          <div class="tl-text"><i class="fas fa-${h.icon}"></i> ${h.desc}</div>
        </div>
      `).join('')
      : '<div style="color:var(--text-muted);font-size:0.85rem;">No actions logged yet. Start above!</div>';
  }

  document.getElementById('username-display').textContent = user.name;
  if (typeof updateGlobalTreeCount === 'function') updateGlobalTreeCount();
}

async function updateGlobalTreeCount(globalTrees = null) {
  if (globalTrees !== null) {
    const el = document.getElementById('global-tree-count');
    if (el) el.textContent = globalTrees.toLocaleString();
    return;
  }
  try {
    const token = localStorage.getItem('clixfix_token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/user/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const el = document.getElementById('global-tree-count');
    if (el) el.textContent = data.global.totalTrees.toLocaleString();
  } catch (err) {
    const base = 1;
    const userTrees = currentState ? currentState.stats.treesSaved : 0;
    const total = base + userTrees + 47;
    const el = document.getElementById('global-tree-count');
    if (el) el.textContent = total.toLocaleString();
  }
}

// Carbon Calculator (unchanged)
const calcTips = {
  transport: "Consider switching to an electric vehicle or public transport to halve your transport emissions.",
  diet: "A plant-based diet can reduce your food carbon footprint by up to 73%.",
  energy: "Installing solar panels or switching to a green energy tariff is the most impactful energy change.",
  flights: "Flights are extremely carbon intensive. Video calls and train travel are far greener alternatives.",
  shopping: "Shopping secondhand or adopting a 'buy less, buy quality' approach significantly reduces emissions."
};

document.getElementById('calc-btn')?.addEventListener('click', () => {
  const transport = parseFloat(document.getElementById('calc-transport').value);
  const distance = parseFloat(document.getElementById('calc-distance').value) || 0;
  const diet = parseFloat(document.getElementById('calc-diet').value);
  const energy = parseFloat(document.getElementById('calc-energy').value);
  const flights = parseFloat(document.getElementById('calc-flights').value);
  const shopping = parseFloat(document.getElementById('calc-shopping').value);

  const tVal = (transport * distance) / 100;
  const dVal = diet;
  const eVal = energy;
  const fVal = flights / 30;
  const sVal = shopping;
  const total = tVal + dVal + eVal + fVal + sVal;
  const max = total * 1.5 || 1;

  const numEl = document.getElementById('footprint-number');
  numEl.textContent = total.toFixed(1);
  const color = total < 8 ? '#00E676' : total < 15 ? '#FFB300' : '#FF5252';
  numEl.style.color = color;

  const globalAvg = 13.7;
  const pct = ((total / globalAvg) * 100).toFixed(0);
  document.getElementById('footprint-compare').textContent =
    total < globalAvg
      ? `✅ ${(100 - pct)}% below global average (${globalAvg} kg)`
      : `⚠️ ${(pct - 100)}% above global average (${globalAvg} kg)`;

  const setBar = (id, vid, val, maxv) => {
    const p = Math.min((val / maxv) * 100, 100);
    document.getElementById(id).style.width = p + '%';
    document.getElementById(vid).textContent = val.toFixed(2) + ' kg';
  };
  setBar('fb-transport', 'fv-transport', tVal, max);
  setBar('fb-diet', 'fv-diet', dVal, max);
  setBar('fb-energy', 'fv-energy', eVal, max);
  setBar('fb-flights', 'fv-flights', fVal, max);
  setBar('fb-shopping', 'fv-shopping', sVal, max);

  const biggest = [['transport', tVal], ['diet', dVal], ['energy', eVal], ['flights', fVal], ['shopping', sVal]].sort((a, b) => b[1] - a[1])[0];
  document.getElementById('calc-tip').textContent = calcTips[biggest[0]];
});

// Claim challenge reward
document.getElementById('claim-reward-btn')?.addEventListener('click', async () => {
  const user = getCurrentUser();
  if (!user || !currentState || currentState.challenge.claimed) return;
  if (currentState.challenge.current >= currentState.challenge.target) {
    currentState.challenge.claimed = true;
    const bonusPoints = 50;
    try {
      const token = localStorage.getItem('clixfix_token');
      showToast('🎉 Challenge Complete!', `You earned ${bonusPoints} bonus points!`);
      renderTracker(currentState, user);
    } catch (err) {
      console.error(err);
    }
  }
});

// On login success, set up state with rotated weekly challenge
async function onAuthSuccess() {
  updateAuthUI();
  const user = getCurrentUser();
  const promptDiv = document.getElementById('login-prompt-wrap');
  const trackerDiv = document.getElementById('tracker-dashboard');

  if (typeof GamifySystem !== 'undefined' && GamifySystem.resetAndReload) {
    GamifySystem.resetAndReload();
  }

  if (user) {
    promptDiv.style.display = 'none';
    trackerDiv.style.display = 'block';

    try {
      const token = localStorage.getItem('clixfix_token');
      const res = await fetch(`${API_BASE}/api/user/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to fetch stats');

      currentState = {
        user: { name: data.user.username, streak: data.streak, lastActive: data.user.lastActive },
        stats: { carbonSaved: data.user.carbonSaved || 0, energySaved: 0, waterSaved: 0, greenScore: 0, treesSaved: data.user.treesPlanted || 0 },
        actions: {},
        achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
        challenge: getWeeklyChallenge(),   // ✅ Rotated weekly
        history: []
      };

      if (data.user.actions && data.user.actions.length > 0) {
        data.user.actions.forEach(a => {
          if (!currentState.actions[a.type]) {
            currentState.actions[a.type] = { ...ECO_ACTIONS[a.type], count: 0 };
          }
          currentState.actions[a.type].count++;
        });

        let energyTotal = 0, waterTotal = 0;
        data.user.actions.forEach(a => {
          const actionDef = ECO_ACTIONS[a.type];
          if (actionDef) {
            energyTotal += actionDef.energy || 0;
            waterTotal += actionDef.water || 0;
          }
        });
        currentState.stats.energySaved = energyTotal;
        currentState.stats.waterSaved = waterTotal;

        updateAchievements(currentState);
        
        currentState.history = data.user.actions.slice(-10).map(a => ({
          date: new Date(a.date).toLocaleString(),
          action: a.type,
          desc: `${ECO_ACTIONS[a.type]?.name || a.type} — saved ${a.co2Saved}kg CO₂ · +${a.pointsEarned} pts`,
          icon: ECO_ACTIONS[a.type]?.icon || 'leaf'
        }));
      }

      const totalPoints = data.user.ecoPoints || 0;
      const maxPossible = 1000;
      currentState.stats.greenScore = Math.min(Math.round((totalPoints / maxPossible) * 100), 100);

      if (typeof renderTracker === 'function') renderTracker(currentState, user);
      if (typeof updateGlobalTreeCount === 'function') updateGlobalTreeCount(data.global?.totalTrees || 1);
    } catch (err) {
      console.error(err);
      if (typeof showToast === 'function') showToast('Error', 'Could not load your eco data. Please refresh.');
    }
  } else {
    promptDiv.style.display = 'block';
    trackerDiv.style.display = 'none';
    currentState = null;
  }
}