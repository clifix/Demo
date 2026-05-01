// ai.js – Groq + Gemini fallback with logging and error visibility

(function() {
  const GROQ_KEY = typeof GROQ_API_KEY !== 'undefined' ? GROQ_API_KEY : '';
  const GEMINI_KEY = typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : '';

  const aiCache = new Map();
  const CACHE_TTL = 10 * 60 * 1000;

  function getCached(key) {
    const entry = aiCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      aiCache.delete(key);
      return null;
    }
    return entry.response;
  }

  function setCached(key, response) {
    aiCache.set(key, { response, ts: Date.now() });
  }

  function buildSystemPrompt() {
    let prompt = "You are CliFix AI, an eco‑weather assistant. Keep answers concise and actionable. ";
    if (typeof currentWeatherData !== 'undefined' && currentWeatherData) {
      const cw = currentWeatherData.current_weather;
      const temp = Math.round(cw.temperature);
      const wind = Math.round(cw.windspeed);
      const cond = typeof getWeatherDescription === 'function' ? getWeatherDescription(cw.weathercode) : '';
      prompt += `Weather: ${temp}°C, ${cond}, wind ${wind} km/h. `;
    }
    if (typeof aqiValue !== 'undefined' && typeof aqiCategory !== 'undefined') {
      prompt += `AQI: ${aqiValue} (${aqiCategory}). `;
    }
    if (typeof currentLocationName !== 'undefined' && currentLocationName) {
      prompt += `Location: ${currentLocationName}. `;
    }
    return prompt;
  }

  async function callGroq(messages) {
    if (!GROQ_KEY) throw new Error('Groq API key missing');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Groq: ${err.error?.message || res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  async function callGemini(promptText) {
    if (!GEMINI_KEY) throw new Error('Gemini API key missing');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Gemini: ${err.error?.message || res.status}`);
    }
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  window.sendAIMessage = async function() {
    const input = document.getElementById('ai-input');
    const messagesEl = document.getElementById('ai-messages');
    if (!input || !messagesEl) return;

    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';

    const userDiv = document.createElement('div');
    userDiv.className = 'ai-msg user';
    userDiv.textContent = msg;
    messagesEl.appendChild(userDiv);

    const typing = document.createElement('div');
    typing.className = 'ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const cacheKey = msg.toLowerCase().trim();
    const cached = getCached(cacheKey);
    if (cached) {
      typing.remove();
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ai-msg ai';
      aiDiv.style.whiteSpace = 'pre-line';
      aiDiv.textContent = cached + '\n\n♻️ (cached)';
      messagesEl.appendChild(aiDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    const systemPrompt = buildSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: msg }
    ];

    let reply = '';
    let fallback = false;

    try {
      reply = await callGroq(messages);
    } catch (e) {
      try {
        const combined = `${systemPrompt}\n\nUser: ${msg}`;
        reply = await callGemini(combined);
        fallback = true;
      } catch (e2) {
        typing.remove();
        const errDiv = document.createElement('div');
        errDiv.className = 'ai-msg ai';
        errDiv.style.color = '#ff5252';
        errDiv.textContent = `❌ AI Error: ${e2.message}`;
        messagesEl.appendChild(errDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return;
      }
    }

    typing.remove();
    setCached(cacheKey, reply);

    const aiDiv = document.createElement('div');
    aiDiv.className = 'ai-msg ai';
    aiDiv.style.whiteSpace = 'pre-line';
    aiDiv.textContent = reply + (fallback ? '\n\n🤖 (via Gemini)' : '');
    messagesEl.appendChild(aiDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  window.toggleAIPanel = function() {
    const panel = document.getElementById('ai-panel');
    const fab = document.getElementById('ai-fab');
    const iconContainer = document.getElementById('ai-fab-icon');
    
    if (!panel) return;
    
    const isOpen = panel.classList.toggle('open');
    if (fab) fab.classList.toggle('open', isOpen);

    if (isOpen && typeof refreshAIInsights === 'function') refreshAIInsights();
  };

  window.refreshAIInsights = function() {
    const container = document.getElementById('ai-insights');
    if (!container) return;
    const insights = [];
    if (typeof currentWeatherData !== 'undefined' && currentWeatherData) {
      const temp = Math.round(currentWeatherData.current_weather.temperature);
      if (temp > 32) insights.push({ icon: 'fa-temperature-high', text: `Hot (${temp}°C) — save energy` });
      else if (temp < 5) insights.push({ icon: 'fa-snowflake', text: `Cold (${temp}°C) — layer up` });
      else insights.push({ icon: 'fa-sun', text: `Good eco day` });
    }
    if (!insights.length) insights.push({ icon: 'fa-leaf', text: 'Analyzing...' });
    container.innerHTML = `<div class="ai-insights-label">Live Recommendations</div>` +
      insights.slice(0, 3).map(i => `<div class="ai-insight-chip"><i class="fas ${i.icon}"></i> ${i.text}</div>`).join('');
  };

  window.callAIForText = async function(promptText) {
    const systemPrompt = buildSystemPrompt();
    try {
      return await callGroq([{ role: 'system', content: systemPrompt }, { role: 'user', content: promptText }]);
    } catch {
      return await callGemini(systemPrompt + '\n\n' + promptText);
    }
  };

  // ═══════════════════════ FIX: ensure FAB works on touch ═══════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    const fab = document.getElementById('ai-fab');
    if (fab) {
      fab.addEventListener('click', function(e) {
        e.preventDefault();
        window.toggleAIPanel();
      });
    }
  });
})();
