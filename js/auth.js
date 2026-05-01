// ═══════════════════════════════════════════════════════
// AUTHENTICATION MODULE
// ═══════════════════════════════════════════════════════

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.add('show');
  switchAuthTab(tab);
  document.getElementById('auth-error').classList.remove('show');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('show');
}

function switchAuthTab(tab) {
  document.getElementById('form-login').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'flex' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('auth-error').classList.remove('show');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  if (!email || !pass) return showAuthError('Please fill in all fields.');

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');

    localStorage.setItem('clixfix_token', data.token);
    localStorage.setItem('clixfix_current_user', JSON.stringify({
      name: data.username,
      email: data.email,
      _id: data._id
    }));

    closeAuthModal();
    onAuthSuccess();
  } catch (err) {
    showAuthError(err.message);
  }
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-password').value;

  if (!name || !email || !pass) return showAuthError('Please fill in all fields.');
  if (pass.length < 6) return showAuthError('Password must be at least 6 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError('Please enter a valid email.');

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email, password: pass })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Signup failed');

    localStorage.setItem('clixfix_token', data.token);
    localStorage.setItem('clixfix_current_user', JSON.stringify({
      name: data.username,
      email: data.email,
      _id: data._id
    }));

    closeAuthModal();
    if (typeof showToast === 'function') showToast('🌳 Tree planted in your name!', 'Welcome to CliFix, ' + name + '!');
    onAuthSuccess();
  } catch (err) {
    showAuthError(err.message);
  }
}

function getCurrentUser() {
  const token = localStorage.getItem('clixfix_token');
  const userJson = localStorage.getItem('clixfix_current_user');
  if (!token || !userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authDiv = document.getElementById('auth-buttons');
  if (!authDiv) return;
  
  if (user && user.name) {
    authDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="color:var(--jade);font-size:0.85rem;display:flex;align-items:center;gap:6px;">
          <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--jade-dim),#00695C);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#000;">${user.name[0].toUpperCase()}</div>
          ${user.name.split(' ')[0]}
        </span>
        <button id="logout-btn" class="btn-outline" style="padding:6px 14px;">Logout</button>
      </div>`;
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('clixfix_current_user');
      localStorage.removeItem('clixfix_token');

      // ✅ Trigger gamification reset on logout before page reload
      if (typeof GamifySystem !== 'undefined' && GamifySystem.resetAndReload) {
        GamifySystem.resetAndReload();
      }

      window.location.reload();
    });
  } else {
    authDiv.innerHTML = `<button class="btn-primary" onclick="openAuthModal('login')"><i class="fas fa-leaf"></i> Login</button>`;
  }
}

async function onAuthSuccess() {
  updateAuthUI();
  const user = getCurrentUser();
  const promptDiv = document.getElementById('login-prompt-wrap');
  const trackerDiv = document.getElementById('tracker-dashboard');

  // ✅ Trigger gamification reset on successful login
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

      // Build state object from server data
      currentState = {
        user: { name: data.user.username, streak: data.user.streak, lastActive: data.user.lastActive },
        stats: { carbonSaved: data.user.carbonSaved || 0, energySaved: 0, waterSaved: 0, greenScore: 0, treesSaved: data.user.treesPlanted || 0 },
        actions: {},
        achievements: ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
        challenge: { ...WEEK_CHALLENGES[Math.floor(Math.random() * WEEK_CHALLENGES.length)], current: 0, claimed: false },
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

// Modal click out close
document.getElementById('auth-modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('auth-modal')) closeAuthModal();
});