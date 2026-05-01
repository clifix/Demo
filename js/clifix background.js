/* ═══════════════════════════════════════════════════════════════════════════
   CLIFIX BACKGROUND DESIGN SYSTEM — clifix-backgrounds.js
   Architecture: ClifixBG module (IIFE)
   ═══════════════════════════════════════════════════════════════════════════ */

window.ClifixBG = (function () {
  'use strict';

  /* ─── Performance detection ───────────────────────────────────────────── */
  const isLowEnd = (
    (navigator.hardwareConcurrency || 4) <= 2 ||
    /Android.*Mobile|iPhone|iPad/.test(navigator.userAgent)
  );

  const PARTICLE_COUNT = isLowEnd ? 28 : 60;
  const RAIN_COUNT     = isLowEnd ? 40 : 110;
  const LEAF_COUNT     = isLowEnd ? 15 : 35;
  const STAR_COUNT     = isLowEnd ? 50 : 120;

  const sections = {};

  /* ── Canvas helpers ──────────────────────────────────────────────────── */
  function makeCanvas(id, parentEl, zIndex = 0) {
    const existing = document.getElementById(id);
    if (existing) return existing;
    const c = document.createElement('canvas');
    c.id = id;
    c.style.cssText = `
      position:absolute; inset:0; width:100%; height:100%;
      pointer-events:none; z-index:${zIndex}; display:block;
      transition: opacity 1.2s ease;
    `;
    parentEl.insertBefore(c, parentEl.firstChild);
    return c;
  }

  /* ── Weather & AQI state ─────────────────────────────────────────────── */
  function getWeatherState() {
    const body = document.body;
    if (body.classList.contains('wx-storm')) return 'storm';
    if (body.classList.contains('wx-rain'))  return 'rain';
    if (body.classList.contains('wx-snow'))  return 'snow';
    if (body.classList.contains('wx-fog'))   return 'fog';
    if (body.classList.contains('wx-night')) return 'night';
    if (body.classList.contains('wx-sunny')) return 'clear';
    return 'clear';
  }

  function getAQIState() {
    const val = typeof aqiValue !== 'undefined' ? +aqiValue : 0;
    if (val <= 0)   return 'good';
    if (val <= 50)  return 'good';
    if (val <= 100) return 'moderate';
    if (val <= 200) return 'unhealthy';
    return 'hazardous';
  }

  function isHot() {
    if (typeof currentWeatherData === 'undefined' || !currentWeatherData) return false;
    const temp = currentWeatherData.current_weather?.temperature ?? 0;
    return temp >= 32;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     1. WEATHER BACKGROUND – Live Atmosphere Engine
     ═══════════════════════════════════════════════════════════════════════ */
  function initWeatherBackground() {
    const section = document.querySelector('.weather-section') || document.getElementById('weather');
    if (!section) return;
    const canvas = makeCanvas('weather-bg-canvas', section, 0);
    const ctx = canvas.getContext('2d');
    let w, h, animId, particles = [], t = 0;

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
      buildParticles();
    }

    function buildParticles() {
      particles = [];
      const state = getWeatherState();
      if (state === 'rain') {
        for (let i = 0; i < RAIN_COUNT; i++) {
          particles.push({
            type: 'rain', x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 18 + 8, speed: Math.random() * 6 + 8,
            angle: 0.18, alpha: Math.random() * 0.35 + 0.12,
          });
        }
      } else if (state === 'storm') {
        for (let i = 0; i < RAIN_COUNT * 1.3; i++) {
          particles.push({
            type: 'rain', x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 22 + 10, speed: Math.random() * 9 + 12,
            angle: 0.28, alpha: Math.random() * 0.4 + 0.15,
            color: `rgba(140,100,210,`,
          });
        }
        for (let i = 0; i < 20; i++) {
          particles.push({
            type: 'wind', x: Math.random() * w, y: Math.random() * h,
            len: Math.random() * 60 + 30, speed: Math.random() * 4 + 3,
            alpha: Math.random() * 0.08 + 0.03,
          });
        }
      } else if (isHot()) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles.push({
            type: 'heat', x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 3 + 1, vy: -(Math.random() * 0.6 + 0.2),
            alpha: Math.random() * 0.12 + 0.03, phase: Math.random() * Math.PI * 2,
          });
        }
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles.push({
            type: 'ambient', x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.5 + 0.3,
            vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
            alpha: Math.random() * 0.25 + 0.05, phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function drawGradient() {
      const state = getWeatherState();
      ctx.clearRect(0, 0, w, h);
      let grad;
      if (state === 'clear' || state === 'night') {
        grad = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, h * 1.2);
        if (state === 'night') {
          grad.addColorStop(0,   'rgba(0,30,20,0.30)');
          grad.addColorStop(0.5, 'rgba(0,15,10,0.15)');
          grad.addColorStop(1,   'rgba(0,5,4,0.0)');
        } else {
          const pulse = 0.20 + Math.sin(t * 0.003) * 0.04;
          grad.addColorStop(0,   `rgba(0,230,118,${pulse})`);
          grad.addColorStop(0.5, 'rgba(0,140,70,0.08)');
          grad.addColorStop(1,   'rgba(0,40,20,0.0)');
        }
      } else if (state === 'rain') {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0,   'rgba(3,12,8,0.55)');
        grad.addColorStop(0.6, 'rgba(5,16,10,0.30)');
        grad.addColorStop(1,   'rgba(5,10,7,0.0)');
      } else if (state === 'storm') {
        const shift = Math.sin(t * 0.004) * 0.04;
        grad = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, h);
        grad.addColorStop(0,   `rgba(80,30,110,${0.18 + shift})`);
        grad.addColorStop(0.5, 'rgba(40,10,70,0.10)');
        grad.addColorStop(1,   'rgba(10,5,16,0.0)');
      } else if (isHot()) {
        const pulse = 0.12 + Math.sin(t * 0.003) * 0.03;
        grad = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, h);
        grad.addColorStop(0,   `rgba(255,80,0,${pulse})`);
        grad.addColorStop(0.5, 'rgba(180,50,0,0.06)');
        grad.addColorStop(1,   'rgba(40,10,0,0.0)');
      } else {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0,   'rgba(5,20,12,0.20)');
        grad.addColorStop(1,   'rgba(2,10,6,0.0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    function drawClouds() {
      const state = getWeatherState();
      if (state === 'clear' || state === 'storm') return;
      const cloudAlpha = (state === 'rain') ? 0.06 : 0.04;
      const scroll = (t * 0.18) % (w + 300);
      for (let i = 0; i < 3; i++) {
        const cx = ((scroll + i * (w / 3)) % (w + 300)) - 150;
        const cy = h * (0.1 + i * 0.08);
        const rx = 180 + i * 40;
        const ry = 50 + i * 10;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
        g.addColorStop(0,   `rgba(0,200,100,${cloudAlpha})`);
        g.addColorStop(0.5, `rgba(0,150,80,${cloudAlpha * 0.5})`);
        g.addColorStop(1,   'rgba(0,150,80,0)');
        ctx.save();
        ctx.scale(1, ry / rx);
        ctx.beginPath();
        ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
    }

    function drawParticles() {
      particles.forEach(p => {
        if (p.type === 'rain') {
          const color = p.color || 'rgba(0,200,120,';
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.strokeStyle = `${color}${p.alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,p.len); ctx.stroke();
          ctx.restore();
          p.y += p.speed;
          p.x -= p.speed * Math.tan(p.angle);
          if (p.y > h || p.x < 0) { p.y = -p.len; p.x = Math.random() * (w + 100); }
        } else if (p.type === 'wind') {
          ctx.strokeStyle = `rgba(140,100,210,${p.alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x+p.len, p.y+p.len*0.1); ctx.stroke();
          p.x += p.speed;
          if (p.x > w + p.len) p.x = -p.len;
        } else if (p.type === 'heat') {
          p.phase += 0.04;
          const wobble = Math.sin(p.phase) * 3;
          ctx.beginPath(); ctx.arc(p.x+wobble, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,100,0,${p.alpha})`; ctx.fill();
          p.y += p.vy;
          if (p.y < -10) { p.y = h+5; p.x = Math.random()*w; }
        } else if (p.type === 'ambient') {
          p.phase += 0.012;
          const a = p.alpha * (0.7 + Math.sin(p.phase)*0.3);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = `rgba(0,230,118,${a})`; ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.x < -5) p.x = w+5; if (p.x > w+5) p.x = -5;
          if (p.y < -5) p.y = h+5; if (p.y > h+5) p.y = -5;
        }
      });
    }

    function loop() {
      t++;
      drawGradient();
      drawClouds();
      drawParticles();
      animId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    loop();

    sections.weather = { canvas, ctx, resize, buildParticles, loop };

    new MutationObserver(() => {
      if (sections.weather) sections.weather.buildParticles();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     2. MAP BACKGROUND – Satellite Command Center
     ═══════════════════════════════════════════════════════════════════════ */
  function initMapBackground() {
    const section = document.getElementById('map-section');
    if (!section) return;

    if (!document.querySelector('.map-section-bg')) {
      const grid = document.createElement('div');
      grid.className = 'map-section-bg';
      section.insertBefore(grid, section.firstChild);
    }

    const canvas = makeCanvas('map-bg-canvas', section, 0);
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, nodes = [];

    if (!document.querySelector('.radar-sweep')) {
      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div');
        ring.className = 'radar-sweep';
        section.appendChild(ring);
      }
    }

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
      nodes = Array.from({ length: isLowEnd ? 4 : 8 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 3 + 2, phase: Math.random() * Math.PI * 2,
      }));
    }

    function drawMap() {
      ctx.clearRect(0, 0, w, h);
      t++;

      const grad = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, Math.max(w,h)*0.7);
      grad.addColorStop(0,   'rgba(0,40,20,0.10)');
      grad.addColorStop(0.6, 'rgba(0,20,10,0.05)');
      grad.addColorStop(1,   'rgba(0,5,2,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,w,h);

      ctx.strokeStyle = 'rgba(0,230,118,0.045)';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

      if (!isLowEnd) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i+1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < w*0.45) {
              const alpha = 0.08 * (1 - dist/(w*0.45));
              ctx.strokeStyle = `rgba(0,230,118,${alpha})`;
              ctx.lineWidth = 0.6;
              ctx.setLineDash([4,12]); ctx.lineDashOffset = -t*0.4;
              ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }

      nodes.forEach(n => {
        n.phase += 0.025;
        const pulse = 0.5 + Math.sin(n.phase)*0.5;
        const outerR = n.r + pulse*8;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, outerR);
        g.addColorStop(0,   `rgba(0,230,118,${0.25*pulse})`);
        g.addColorStop(0.5, `rgba(0,230,118,${0.08*pulse})`);
        g.addColorStop(1,   'rgba(0,230,118,0)');
        ctx.beginPath(); ctx.arc(n.x, n.y, outerR, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,230,118,0.7)'; ctx.fill();
      });

      const sweepAngle = (t*0.018) % (Math.PI*2);
      const sweepCx = w*0.5, sweepCy = h*0.5, sweepR = Math.min(w,h)*0.4;
      ctx.save();
      ctx.translate(sweepCx, sweepCy);
      ctx.rotate(sweepAngle);
      const sweep = ctx.createLinearGradient(0, 0, sweepR, 0);
      sweep.addColorStop(0,   'rgba(0,230,118,0.12)');
      sweep.addColorStop(0.6, 'rgba(0,230,118,0.04)');
      sweep.addColorStop(1,   'rgba(0,230,118,0.0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,sweepR,-0.4,0); ctx.lineTo(0,0);
      ctx.fillStyle = sweep; ctx.fill();
      ctx.restore();
    }

    resize();
    window.addEventListener('resize', resize);
    function loop() { drawMap(); requestAnimationFrame(loop); }
    loop();
    sections.map = { canvas, ctx };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3. AQI BACKGROUND – Invisible Air Made Visible
     ═══════════════════════════════════════════════════════════════════════ */
  function initAQIBackground() {
    const section = document.getElementById('air-quality');
    if (!section) return;

    if (!section.querySelector('.aqi-fog-layer')) {
      for (let i = 0; i < 3; i++) {
        const fog = document.createElement('div');
        fog.className = 'aqi-fog-layer';
        section.insertBefore(fog, section.firstChild);
      }
    }

    const canvas = makeCanvas('aqi-bg-canvas', section, 0);
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, blobs = [];

    const AQI_COLORS = {
      good:      { r:0,   g:230, b:118 },
      moderate:  { r:255, g:179, b:0   },
      unhealthy: { r:255, g:82,  b:82  },
      hazardous: { r:139, g:24,  b:170 },
    };

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
      blobs = Array.from({ length: isLowEnd ? 5 : 12 }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 100 + 60,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.14,
        phase: i * 0.7, alpha: Math.random() * 0.06 + 0.02,
      }));
    }

    function updateAQISection() {
      const state = getAQIState();
      section.setAttribute('data-aqi-state', state);
      const c = AQI_COLORS[state] || AQI_COLORS.good;
      section.style.setProperty('--aqi-fog-color', `rgba(${c.r},${c.g},${c.b},0.08)`);
    }

    function drawAQI() {
      ctx.clearRect(0, 0, w, h);
      t++;
      updateAQISection();
      const state = getAQIState();
      const c = AQI_COLORS[state] || AQI_COLORS.good;
      blobs.forEach(b => {
        b.phase += 0.008;
        b.x += b.vx + Math.sin(b.phase*0.5)*0.15;
        b.y += b.vy + Math.cos(b.phase*0.3)*0.1;
        if (b.x < -b.r) b.x = w + b.r; if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r; if (b.y > h + b.r) b.y = -b.r;
        const pulse = b.alpha * (0.8 + Math.sin(b.phase)*0.2);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},${pulse})`);
        g.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${pulse*0.4})`);
        g.addColorStop(1,   `rgba(${c.r},${c.g},${c.b},0)`);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
      });
      const haze = ctx.createLinearGradient(0, h*0.6, 0, h);
      haze.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0)`);
      haze.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0.05)`);
      ctx.fillStyle = haze; ctx.fillRect(0, h*0.6, w, h*0.4);
    }

    resize();
    window.addEventListener('resize', resize);
    function loop() { drawAQI(); requestAnimationFrame(loop); }
    loop();
    sections.aqi = { canvas, ctx };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. CLIMATE REPORT BACKGROUND
     ═══════════════════════════════════════════════════════════════════════ */
  function initClimateBackground() {
    const section = document.getElementById('climate-report');
    if (!section) return;
    const canvas = makeCanvas('climate-bg-canvas', section, 0);
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, dataLines = [], dataPoints = [], stars = [];

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
      stars = Array.from({ length: isLowEnd ? 25 : 55 }, () => ({
        x: Math.random()*w, y: Math.random()*h,
        r: Math.random()*1.0+0.2, phase: Math.random()*Math.PI*2,
        speed: Math.random()*0.015+0.005,
      }));
      dataLines = Array.from({ length: isLowEnd ? 2 : 5 }, (_, i) => {
        const pts = [];
        const startX = Math.random()*w*0.3;
        const endX   = startX + w*(0.3+Math.random()*0.5);
        const y      = h*(0.2 + i*0.15);
        const segs   = 12;
        for (let s = 0; s <= segs; s++) {
          pts.push({ x: startX + (endX-startX)*(s/segs), y: y + (Math.random()-0.5)*h*0.08 });
        }
        return { pts, hue: i%2===0 ? 152 : 198, alpha: 0.12+Math.random()*0.06, phase: i*1.1, speed: 0.003+Math.random()*0.002 };
      });
      dataPoints = Array.from({ length: isLowEnd ? 4 : 10 }, () => ({
        x: Math.random()*w, y: Math.random()*h,
        r: Math.random()*2.5+1.5, phase: Math.random()*Math.PI*2,
        hue: Math.random()>0.5 ? 152 : 198, speed: 0.02+Math.random()*0.02,
      }));
    }

    function drawClimate() {
      ctx.clearRect(0,0,w,h); t++;
      const base = ctx.createLinearGradient(0,0,0,h);
      base.addColorStop(0,   'rgba(3,8,6,0.22)');
      base.addColorStop(0.5, 'rgba(5,12,10,0.10)');
      base.addColorStop(1,   'rgba(2,8,6,0.22)');
      ctx.fillStyle = base; ctx.fillRect(0,0,w,h);

      stars.forEach(s => {
        s.phase += s.speed;
        const alpha = 0.3+Math.sin(s.phase)*0.25;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(200,230,210,${alpha})`; ctx.fill();
      });

      dataLines.forEach(line => {
        line.phase += line.speed;
        ctx.beginPath();
        line.pts.forEach((pt,i) => {
          const y = pt.y + Math.sin(line.phase + i*0.4)*6;
          if (i===0) ctx.moveTo(pt.x, y); else ctx.lineTo(pt.x, y);
        });
        ctx.strokeStyle = `hsla(${line.hue},100%,55%,${line.alpha})`;
        ctx.lineWidth = 1; ctx.stroke();
        const last = line.pts[line.pts.length-1];
        const ly = last.y + Math.sin(line.phase + line.pts.length*0.4)*6;
        const glow = ctx.createRadialGradient(last.x, ly, 0, last.x, ly, 12);
        glow.addColorStop(0, `hsla(${line.hue},100%,65%,0.35)`);
        glow.addColorStop(1, `hsla(${line.hue},100%,55%,0)`);
        ctx.beginPath(); ctx.arc(last.x, ly, 12, 0, Math.PI*2);
        ctx.fillStyle = glow; ctx.fill();
      });

      dataPoints.forEach(dp => {
        dp.phase += dp.speed;
        const pulse = 0.6+Math.sin(dp.phase)*0.4;
        const outerR = dp.r*(2 + pulse*2);
        const g = ctx.createRadialGradient(dp.x, dp.y, 0, dp.x, dp.y, outerR);
        g.addColorStop(0,   `hsla(${dp.hue},100%,60%,${0.5*pulse})`);
        g.addColorStop(0.4, `hsla(${dp.hue},100%,55%,${0.15*pulse})`);
        g.addColorStop(1,   `hsla(${dp.hue},100%,50%,0)`);
        ctx.beginPath(); ctx.arc(dp.x, dp.y, outerR, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(dp.x, dp.y, dp.r, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${dp.hue},100%,70%,0.9)`; ctx.fill();
      });
    }

    resize();
    window.addEventListener('resize', resize);
    function loop() { drawClimate(); requestAnimationFrame(loop); }
    loop();
    sections.climate = { canvas, ctx };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     5. ECO TIPS – Hope & Recovery
     ═══════════════════════════════════════════════════════════════════════ */
  function initEcoBackground() {
    const section = document.getElementById('eco-tips');
    if (!section) return;
    const canvas = makeCanvas('eco-bg-canvas', section, 0);
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, leaves = [], orbs = [];

    function resize() {
      w = canvas.width  = section.offsetWidth;
      h = canvas.height = section.offsetHeight;
      leaves = Array.from({ length: LEAF_COUNT }, (_, i) => ({
        x: Math.random()*w, y: Math.random()*h, size: Math.random()*6+3,
        angle: Math.random()*Math.PI*2, vx: (Math.random()-0.5)*0.5,
        vy: -(Math.random()*0.4+0.15), rot: (Math.random()-0.5)*0.03,
        phase: i*0.3, alpha: Math.random()*0.25+0.08,
        hue: 120+Math.random()*40, swing: (Math.random()-0.5)*0.012,
      }));
      orbs = Array.from({ length: isLowEnd ? 6 : 14 }, () => ({
        x: Math.random(), y: Math.random(), r: Math.random()*80+40,
        phase: Math.random()*Math.PI*2, speed: 0.004+Math.random()*0.003,
        hue: 130+Math.random()*40, alpha: 0.025+Math.random()*0.02,
      }));
    }

    function drawLeaf(ctx, x, y, size, angle, alpha, hue) {
      ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0,-size);
      ctx.quadraticCurveTo(size*0.7, -size*0.3, 0, size*0.4);
      ctx.quadraticCurveTo(-size*0.7, -size*0.3, 0, -size);
      ctx.fillStyle = `hsl(${hue},80%,42%)`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,-size*0.9); ctx.lineTo(0,size*0.35);
      ctx.strokeStyle = `hsla(${hue},80%,30%,0.5)`; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();
    }

    function drawEco() {
      ctx.clearRect(0,0,w,h); t++;
      orbs.forEach(o => {
        o.phase += o.speed;
        const cx = (o.x + Math.sin(o.phase)*0.08)*w;
        const cy = (o.y + Math.cos(o.phase*0.7)*0.06)*h;
        const alpha = o.alpha*(0.8+Math.sin(o.phase*1.3)*0.2);
        const g = ctx.createRadialGradient(cx,cy,0,cx,cy,o.r);
        g.addColorStop(0,   `hsla(${o.hue},80%,45%,${alpha})`);
        g.addColorStop(0.5, `hsla(${o.hue},80%,40%,${alpha*0.4})`);
        g.addColorStop(1,   `hsla(${o.hue},80%,35%,0)`);
        ctx.beginPath(); ctx.arc(cx,cy,o.r,0,Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
      });
      leaves.forEach(lf => {
        lf.phase += 0.012; lf.angle += lf.rot;
        lf.vx += lf.swing; lf.vx *= 0.99;
        lf.x += lf.vx + Math.sin(lf.phase)*0.3;
        lf.y += lf.vy;
        const alpha = lf.alpha*(0.7+Math.sin(lf.phase*0.5)*0.3);
        drawLeaf(ctx, lf.x, lf.y, lf.size, lf.angle, alpha, lf.hue);
        if (lf.y < -20) { lf.y = h+10; lf.x = Math.random()*w; }
      });
    }

    canvas.style.opacity = '0.8'; // always visible, no scroll observer
    resize();
    window.addEventListener('resize', resize);
    function loop() { drawEco(); requestAnimationFrame(loop); }
    loop();
    sections.eco = { canvas, ctx };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     6. FOOTER BACKGROUND – Earth from Space
     ═══════════════════════════════════════════════════════════════════════ */
  function initFooterBackground() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const canvas = makeCanvas('footer-bg-canvas', footer, 0);
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, stars = [];

    function resize() {
      w = canvas.width  = footer.offsetWidth;
      h = canvas.height = footer.offsetHeight;
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random()*w, y: Math.random()*h*0.85,
        r: Math.random()*1.0+0.15, alpha: Math.random()*0.6+0.15,
        phase: Math.random()*Math.PI*2, speed: Math.random()*0.008+0.003,
      }));
    }

    function drawFooter() {
      ctx.clearRect(0,0,w,h); t++;
      const bg = ctx.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,   'rgba(2,5,4,0.85)');
      bg.addColorStop(0.7, 'rgba(3,8,6,0.80)');
      bg.addColorStop(1,   'rgba(0,30,20,0.30)');
      ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
      stars.forEach(s => {
        s.phase += s.speed;
        const a = s.alpha*(0.6+Math.sin(s.phase)*0.4);
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(210,240,225,${a})`; ctx.fill();
      });
      const horizon = ctx.createLinearGradient(0, h*0.6, 0, h);
      horizon.addColorStop(0,   'rgba(0,40,20,0.0)');
      horizon.addColorStop(0.5, 'rgba(0,200,100,0.06)');
      horizon.addColorStop(1,   'rgba(0,80,40,0.12)');
      ctx.fillStyle = horizon; ctx.fillRect(0, h*0.6, w, h*0.4);
      if (!isLowEnd) {
        const auroras = [
          { hue: 152, y: 0.55 }, { hue: 180, y: 0.65 }
        ];
        auroras.forEach(ac => {
          const scroll = (t*0.06 + ac.y*200) % (w+400);
          const g = ctx.createRadialGradient(scroll-200, h*ac.y, 0, scroll-200, h*ac.y, 250);
          g.addColorStop(0,   `hsla(${ac.hue},100%,55%,0.04)`);
          g.addColorStop(0.5, `hsla(${ac.hue},80%,45%,0.015)`);
          g.addColorStop(1,   `hsla(${ac.hue},60%,35%,0)`);
          ctx.beginPath(); ctx.ellipse(scroll-200, h*ac.y, 250, 35, 0, 0, Math.PI*2);
          ctx.fillStyle = g; ctx.fill();
        });
      }
    }

    resize();
    window.addEventListener('resize', resize);
    function loop() { drawFooter(); requestAnimationFrame(loop); }
    loop();
    sections.footer = { canvas, ctx };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     7. WEATHER HOOK
     ═══════════════════════════════════════════════════════════════════════ */
  function hookWeatherUpdates() {
    const mo = new MutationObserver(() => {
      if (sections.weather?.buildParticles) sections.weather.buildParticles();
      if (isHot()) document.body.setAttribute('data-temp-hot', '');
      else document.body.removeAttribute('data-temp-hot');
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PUBLIC INIT – NO SCROLL OBSERVERS, NO DIVIDERS
     ═══════════════════════════════════════════════════════════════════════ */
  function init() {
    if (!document.getElementById('clifix-bg-css')) {
      const link = document.createElement('link');
      link.id = 'clifix-bg-css'; link.rel = 'stylesheet'; link.href = 'backgrounds.css';
      document.head.appendChild(link);
    }

    requestAnimationFrame(() => {
      initWeatherBackground();
      setTimeout(() => { initAQIBackground();      }, 200);
      setTimeout(() => { initClimateBackground();   }, 400);
      setTimeout(() => { initMapBackground();       }, 600);
      setTimeout(() => { initEcoBackground();       }, 800);
      setTimeout(() => { initFooterBackground();    }, 1000);
      setTimeout(() => { hookWeatherUpdates();      }, 1200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 150);
  }

  return { init, getWeatherState, getAQIState };
})();