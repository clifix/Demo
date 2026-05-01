// ═══════════════════════════════════════════════════════
// CLIMATE-REPORT.JS – Comparison Charts
// ═══════════════════════════════════════════════════════

let tempComparisonChart = null;
let co2ComparisonChart = null;

// ─────────────────────────────────────────────────────
// INITIALISE THE CHART CANVASES (call once)
// ─────────────────────────────────────────────────────
function initClimateComparisonCharts() {
  const tCtx = document.getElementById('tempComparisonChart')?.getContext('2d');
  if (tCtx && !tempComparisonChart) {
    tempComparisonChart = new Chart(tCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'This Week',
            data: [],
            borderColor: '#FF7043',
            backgroundColor: 'rgba(255,112,67,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#FF7043',
            borderWidth: 2
          },
          {
            label: 'Last Week',
            data: [],
            borderColor: '#42A5F5',
            backgroundColor: 'rgba(66,165,245,0.05)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#42A5F5',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,230,118,0.05)' },
            ticks: { color: '#8FAD8A' }
          },
          x: {
            grid: { color: 'rgba(0,230,118,0.05)' },
            ticks: { color: '#8FAD8A', maxTicksLimit: 7 }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#8FAD8A', usePointStyle: true, padding: 20 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,30,15,0.95)',
            borderColor: 'rgba(0,230,118,0.3)',
            borderWidth: 1
          }
        }
      }
    });
  }

  const cCtx = document.getElementById('co2ComparisonChart')?.getContext('2d');
  if (cCtx && !co2ComparisonChart) {
    co2ComparisonChart = new Chart(cCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'This Week',
            data: [],
            borderColor: '#00E676',
            backgroundColor: 'rgba(0,230,118,0.07)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#00E676',
            borderWidth: 2
          },
          {
            label: 'Last Week',
            data: [],
            borderColor: '#9C27B0',
            backgroundColor: 'rgba(156,39,176,0.05)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#9C27B0',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,230,118,0.05)' },
            ticks: { color: '#8FAD8A' }
          },
          x: {
            grid: { color: 'rgba(0,230,118,0.05)' },
            ticks: { color: '#8FAD8A', maxTicksLimit: 7 }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#8FAD8A', usePointStyle: true, padding: 20 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,30,15,0.95)',
            borderColor: 'rgba(0,230,118,0.3)',
            borderWidth: 1
          }
        }
      }
    });
  }
}

// ─────────────────────────────────────────────────────
// FETCH & UPDATE TEMPERATURE COMPARISON
// ─────────────────────────────────────────────────────
async function updateTempComparison() {
  if (!currentLat || !currentLon) return;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}` +
    `&daily=temperature_2m_mean&timezone=auto&past_days=14&forecast_days=0`;

  try {
    const r = await fetch(url);
    const d = await r.json();
    const days = d.daily.time;
    const temps = d.daily.temperature_2m_mean;

    // Separate into this week (last 7 days) and previous week (7 days before that)
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    let thisWeekDates = [], thisWeekTemps = [];
    let lastWeekDates = [], lastWeekTemps = [];

    for (let i = 0; i < days.length; i++) {
      const d = new Date(days[i]);
      if (d >= weekAgo) {
        thisWeekDates.push(days[i]);
        thisWeekTemps.push(temps[i]);
      } else if (d >= twoWeeksAgo) {
        lastWeekDates.push(days[i]);
        lastWeekTemps.push(temps[i]);
      }
    }

    // Labels: show day of week (short)
    const formatDay = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const thisLabels = thisWeekDates.map(formatDay);
    const lastLabels = lastWeekDates.map(formatDay);

    // Update chart
    if (tempComparisonChart) {
      tempComparisonChart.data.labels = thisLabels;
      tempComparisonChart.data.datasets[0].data = thisWeekTemps;
      tempComparisonChart.data.datasets[0].label = 'This Week';
      tempComparisonChart.data.datasets[1].data = lastWeekTemps;
      tempComparisonChart.data.datasets[1].label = 'Last Week';
      tempComparisonChart.update();
    }

    // Summary text
    if (thisWeekTemps.length && lastWeekTemps.length) {
      const thisAvg = (thisWeekTemps.reduce((a,b)=>a+b,0)/thisWeekTemps.length).toFixed(1);
      const lastAvg = (lastWeekTemps.reduce((a,b)=>a+b,0)/lastWeekTemps.length).toFixed(1);
      const diff = (thisAvg - lastAvg).toFixed(1);
      const sign = diff > 0 ? '+' : '';
      document.getElementById('temp-compare-summary').textContent =
        `This week avg ${thisAvg}°C · Last week avg ${lastAvg}°C · Change ${sign}${diff}°C`;
    }
  } catch (e) {
    console.warn('Temp comparison error', e);
  }
}

// ─────────────────────────────────────────────────────
// FETCH & UPDATE CO₂ COMPARISON
// ─────────────────────────────────────────────────────
async function updateCO2Comparison() {
  try {
    const r = await fetch('https://global-warming.org/api/co2-api');
    const d = await r.json();
    if (!d.co2 || !d.co2.length) return;

    // Sort by date
    const sorted = d.co2.sort((a,b) => {
      const da = new Date(`${a.year}-${String(a.month).padStart(2,'0')}-${String(a.day).padStart(2,'0')}`);
      const db = new Date(`${b.year}-${String(b.month).padStart(2,'0')}-${String(b.day).padStart(2,'0')}`);
      return da - db;
    });

    // Take last 14 entries
    const recent = sorted.slice(-14);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let thisWeekData = [], lastWeekData = [];
    let thisWeekLabels = [], lastWeekLabels = [];

    recent.forEach(entry => {
      const date = new Date(`${entry.year}-${String(entry.month).padStart(2,'0')}-${String(entry.day).padStart(2,'0')}`);
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (date >= weekAgo) {
        thisWeekLabels.push(dayLabel);
        thisWeekData.push(parseFloat(entry.cycle));
      } else if (date >= twoWeeksAgo) {
        lastWeekLabels.push(dayLabel);
        lastWeekData.push(parseFloat(entry.cycle));
      }
    });

    // Update chart
    if (co2ComparisonChart) {
      co2ComparisonChart.data.labels = thisWeekLabels;  // show this week's labels, last week aligned on same days
      // Align length: pad shorter array with nulls to match length
      const maxLen = Math.max(thisWeekData.length, lastWeekData.length);
      const thisWeekPadded = [...thisWeekData];
      const lastWeekPadded = [...lastWeekData];
      while (thisWeekPadded.length < maxLen) thisWeekPadded.push(null);
      while (lastWeekPadded.length < maxLen) lastWeekPadded.push(null);

      co2ComparisonChart.data.datasets[0].data = thisWeekPadded;
      co2ComparisonChart.data.datasets[0].label = 'This Week';
      co2ComparisonChart.data.datasets[1].data = lastWeekPadded;
      co2ComparisonChart.data.datasets[1].label = 'Last Week';
      co2ComparisonChart.update();
    }

    // Summary text
    if (thisWeekData.length && lastWeekData.length) {
      const thisAvg = (thisWeekData.reduce((a,b)=>a+b,0)/thisWeekData.length).toFixed(2);
      const lastAvg = (lastWeekData.reduce((a,b)=>a+b,0)/lastWeekData.length).toFixed(2);
      const diff = (thisAvg - lastAvg).toFixed(2);
      const sign = diff > 0 ? '+' : '';
      document.getElementById('co2-compare-summary').textContent =
        `This week avg ${thisAvg} ppm · Last week avg ${lastAvg} ppm · Change ${sign}${diff} ppm`;
    }
  } catch (e) {
    console.warn('CO2 comparison error', e);
  }
}

// ─────────────────────────────────────────────────────
// MASTER FUNCTION – call after location/setup
// ─────────────────────────────────────────────────────
async function loadClimateReport() {
  initClimateComparisonCharts();
  await Promise.all([
    updateTempComparison(),
    updateCO2Comparison()
  ]);
}

// ─────────────────────────────────────────────────────
// DOWNLOAD & SHARE (unchanged)
// ─────────────────────────────────────────────────────
function initClimateReportActions() {
  document.getElementById('download-btn-phase1')?.addEventListener('click', () => {
    const location = document.getElementById('location-display')?.innerText || 'Unknown';
    const tempSummary = document.getElementById('temp-compare-summary')?.innerText || '';
    const co2Summary = document.getElementById('co2-compare-summary')?.innerText || '';

    const text = `🌱 CliFix Weekly Climate Report
════════════════════════════════
📍 ${location}
📅 ${new Date().toLocaleDateString()}

🌡️ Temperature (7‑day daily)
${tempSummary}

🌍 Global CO₂ (7‑day daily)
${co2Summary}

Generated by CliFix · ${new Date().toISOString()}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CliFix-Weekly-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (typeof showToast === 'function') showToast('Report Downloaded', 'Open the .txt file for a print‑ready summary.');
  });

  document.getElementById('share-btn-phase1')?.addEventListener('click', async () => {
    const tempSummary = document.getElementById('temp-compare-summary')?.innerText || '';
    const co2Summary = document.getElementById('co2-compare-summary')?.innerText || '';
    const shareText = `🌍 Weekly climate report: ${tempSummary} · ${co2Summary} (via CliFix)`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Climate Report', text: shareText }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(shareText); } catch {}
      if (typeof showToast === 'function') showToast('Copied to clipboard', '');
    }
  });
}

// Expose for main.js
window.loadClimateReport = loadClimateReport;
window.initClimateReportActions = initClimateReportActions;