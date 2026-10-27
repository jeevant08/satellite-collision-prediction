// =============================================================
//  dashboard.js — Member 4's File
//  TASK: UI Controls, Risk Cards, Live Metrics, & Chart.js Graph
// =============================================================
//
//  RUBRIC COVERAGE:
//    (c) Live Demo       — Edge case handling & dynamic metric dashboard
//    (d) Time Complexity — Visual Chart.js proof comparing BF vs KD Tree
//
//  FACULTY QUESTIONS TO PREPARE:
//    Q: How does the dashboard update when parameters change?
//    A: Sliders trigger instant feedback on DOM elements. Asynchronous
//       fetch requests retrieve backend results and seamlessly update
//       the Top 10 cards and performance charts.
//
//    Q: How are edge cases handled in the interface?
//    A: If N=0 or N=1, friendly sci-fi warning badges prevent invalid queries
//       and communicate system status directly to the user.
//
//  HOW TO CONTRIBUTE:
//    git add static/js/dashboard.js
//    git commit -m "[Member4] feat: implement UI control bindings and risk card renderer"
//    git commit -m "[Member4] feat: add Chart.js benchmark graph integration"
// =============================================================

let benchmarkChartInstance = null;

/**
 * Initializes slider value listeners and connects buttons to callback handlers.
 * @param {Object} handlers - { onGenerate, onSimulate, onStepTree, onClearPlanes,
 *                              onBenchmark, onToggleAnimation, onToggleRadii }
 */
export function initControls(handlers) {
  const satSlider = document.getElementById('satelliteCount');
  const satVal    = document.getElementById('satelliteCountVal');
  const radSlider = document.getElementById('dangerRadius');
  const radVal    = document.getElementById('dangerRadiusVal');

  if (satSlider && satVal) {
    satSlider.addEventListener('input', (e) => {
      satVal.textContent = e.target.value;
    });
  }

  if (radSlider && radVal) {
    radSlider.addEventListener('input', (e) => {
      radVal.textContent = `${e.target.value} km`;
    });
  }

  // Button hooks
  document.getElementById('btnGenerate')?.addEventListener('click', () => {
    const count = parseInt(satSlider?.value || 100);
    handlers.onGenerate(count);
  });

  document.getElementById('btnSimulate')?.addEventListener('click', () => {
    const radius = parseFloat(radSlider?.value || 500);
    handlers.onSimulate(radius);
  });

  document.getElementById('btnStepTree')?.addEventListener('click', () => {
    handlers.onStepTree();
  });

  document.getElementById('btnClearPlanes')?.addEventListener('click', () => {
    handlers.onClearPlanes();
  });

  document.getElementById('btnRunBenchmark')?.addEventListener('click', () => {
    const radius = parseFloat(radSlider?.value || 500);
    handlers.onBenchmark(radius);
  });

  document.getElementById('btnToggleAnimation')?.addEventListener('click', () => {
    if (handlers.onToggleAnimation) handlers.onToggleAnimation();
  });

  document.getElementById('btnToggleRadii')?.addEventListener('click', () => {
    if (handlers.onToggleRadii) handlers.onToggleRadii();
  });
}

/**
 * Updates the numerical stats displayed in the dashboard header cards
 * and the top nav strip simultaneously.
 * @param {number|string} objectCount
 * @param {number|string} riskCount
 * @param {number|string|null} speedup
 */
export function updateLiveStats(objectCount, riskCount, speedup) {
  // Right panel stat cards
  _animateCounter('statObjectCount', objectCount);
  _animateCounter('statRiskCount',   riskCount);

  const elSpeedup    = document.getElementById('statSpeedup');
  if (elSpeedup) elSpeedup.textContent = speedup ? `${speedup}x` : '--';

  // Top nav strip mirror
  _animateCounter('navStatObjects', objectCount);
  _animateCounter('navStatRisks',   riskCount);
  const navSpeedup = document.getElementById('navStatSpeedup');
  if (navSpeedup) navSpeedup.textContent = speedup ? `${speedup}x` : '--';
}

/**
 * Updates the BF vs KD comparison counters in the right panel.
 * @param {number} n - current satellite count
 */
export function updateComparisonStats(n) {
  const bfEl = document.getElementById('statBFComps');
  const kdEl = document.getElementById('statKDComps');

  if (!bfEl || !kdEl) return;

  if (!n || n < 2) {
    bfEl.textContent = '--';
    kdEl.textContent = '--';
    return;
  }

  // BF: exact = N*(N-1)/2
  const bfComps = Math.floor(n * (n - 1) / 2);
  // KD: approximate = N * log2(N)
  const kdComps = Math.round(n * Math.log2(n));

  bfEl.textContent = bfComps.toLocaleString();
  kdEl.textContent = kdComps.toLocaleString();
}

/**
 * Renders the top 10 most critical collision risks extracted from the Max-Heap.
 * Cards are clickable — clicking focuses the 3D camera on the satellite pair.
 *
 * @param {Array} topRisks - Array of {sat1_id, sat1_name, sat2_id, sat2_name, distance}
 * @param {Function|null} onRiskCardClick - Optional callback(sat1_id, sat2_id)
 */
export function renderRiskList(topRisks, onRiskCardClick = null) {
  const container = document.getElementById('riskList');
  if (!container) return;

  container.innerHTML = '';

  if (!topRisks || topRisks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🛡️</span>
        <p>All Clear — No immediate collision risks within radius.</p>
      </div>`;
    return;
  }

  topRisks.forEach((risk, idx) => {
    const card = document.createElement('div');
    card.className = 'risk-card';
    card.style.setProperty('--card-index', idx);
    card.title = 'Click to focus camera on this pair';
    card.innerHTML = `
      <div>
        <strong>#${idx + 1}</strong>
        <span> ${risk.sat1_name} ↔ ${risk.sat2_name}</span>
      </div>
      <div class="risk-dist">${risk.distance} km</div>
    `;

    if (onRiskCardClick) {
      card.addEventListener('click', () => {
        onRiskCardClick(risk.sat1_id, risk.sat2_id);

        // Visual feedback
        document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Fade out viewport hint
        const hint = document.getElementById('viewportHint');
        if (hint) hint.classList.add('fade-out');
      });
    }

    container.appendChild(card);
  });
}

/**
 * Displays status messages or warnings for edge cases.
 * @param {string} type - 'info' | 'warning'
 * @param {string} message - Message text
 */
export function showStatusMessage(type, message) {
  const alert = document.getElementById('statusAlert');
  if (!alert) return;

  if (!message) {
    alert.className = 'status-alert hidden';
    alert.textContent = '';
    return;
  }

  alert.className = `status-alert ${type}`;
  alert.textContent = message;
}

/**
 * Sets the global busy/ready state in the system status indicator.
 * @param {boolean} isBusy
 * @param {string} label - e.g. "RUNNING..." or "SYSTEM READY"
 */
export function setSystemBusy(isBusy, label = '') {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');

  if (dot) {
    dot.className = isBusy ? 'status-dot busy' : 'status-dot online';
  }
  if (text) {
    text.textContent = label || (isBusy ? 'PROCESSING…' : 'SYSTEM READY');
  }
}

/**
 * Sets a button into loading state (or restores it).
 * @param {string} id - Button element ID
 * @param {boolean} isLoading
 * @param {string} [originalText] - Text to restore when not loading
 */
export function setBtnLoading(id, isLoading, originalText = '') {
  const btn = document.getElementById(id);
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = `<span class="btn-icon">⟳</span> Working…`;
  } else {
    btn.classList.remove('loading');
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

/**
 * Updates the K-D Tree depth label and axis badge.
 * @param {number} depth
 */
export function updateDepthLabel(depth) {
  const depthEl = document.getElementById('currentDepthLabel');
  const axisEl  = document.getElementById('depthAxisLabel');
  const axes    = ['X', 'Y', 'Z'];

  if (depthEl) depthEl.textContent = depth;
  if (axisEl) {
    axisEl.textContent = depth > 0 ? axes[(depth - 1) % 3] : '';
  }
}

/**
 * Updates the animation toggle button label.
 * @param {boolean} isAnimating
 */
export function updateAnimToggleBtn(isAnimating) {
  const btn   = document.getElementById('btnToggleAnimation');
  const label = document.getElementById('animToggleLabel');
  if (!btn || !label) return;

  label.textContent = isAnimating ? 'Pause Orbits' : 'Resume Orbits';
  const icon = btn.querySelector('.btn-icon');
  if (icon) icon.textContent = isAnimating ? '⏸️' : '▶️';
}

/**
 * Shows the danger radii toggle button.
 * @param {boolean} visible
 */
export function setRadiiToggleVisible(visible) {
  const btn = document.getElementById('btnToggleRadii');
  if (!btn) return;
  if (visible) btn.classList.remove('hidden');
  else btn.classList.add('hidden');
}

/**
 * Updates the radii toggle button label.
 * @param {boolean} showing
 */
export function updateRadiiToggleBtn(showing) {
  const label = document.getElementById('radiiToggleLabel');
  if (label) label.textContent = showing ? 'Hide Radii' : 'Show Radii';
}

/**
 * Draws or updates the Chart.js line graph comparing Brute Force vs K-D Tree.
 * @param {Array} benchmarkData - Array of {n, bf_time_ms, kd_total_ms}
 */
export function renderComparisonChart(benchmarkData) {
  const canvas = document.getElementById('benchmarkChart');
  const placeholder = document.getElementById('chartPlaceholder');

  const ctx = canvas?.getContext('2d');
  if (!ctx || !benchmarkData || benchmarkData.length === 0) return;

  // Hide placeholder
  if (placeholder) placeholder.classList.add('hidden');

  const labels  = benchmarkData.map(d => d.n);
  const bfTimes = benchmarkData.map(d => d.bf_time_ms);
  const kdTimes = benchmarkData.map(d => d.kd_total_ms);

  if (benchmarkChartInstance) {
    benchmarkChartInstance.destroy();
  }

  benchmarkChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Brute Force O(N²)',
          data: bfTimes,
          borderColor: '#ff4757',
          backgroundColor: 'rgba(255, 71, 87, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ff4757',
          borderWidth: 2
        },
        {
          label: 'K-D Tree O(N log N)',
          data: kdTimes,
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79, 142, 247, 0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4f8ef7',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Exo 2', size: 10 },
            boxWidth: 12,
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(5, 7, 20, 0.92)',
          borderColor: 'rgba(79, 142, 247, 0.4)',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} ms`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Satellites (N)', color: '#64748b', font: { size: 10 } },
          ticks: { color: '#94a3b8', font: { size: 9 } },
          grid:  { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          title: { display: true, text: 'Time (ms)', color: '#64748b', font: { size: 10 } },
          ticks: { color: '#94a3b8', font: { size: 9 } },
          grid:  { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

/**
 * Renders the complexity comparison table from backend data.
 * @param {Array} complexityData - Array of {operation, brute_force, kd_tree}
 */
export function renderComplexityTable(complexityData) {
  const section = document.getElementById('complexityTableSection');
  const tableEl = document.getElementById('complexityTable');

  if (!section || !tableEl || !complexityData || complexityData.length === 0) return;

  section.classList.remove('hidden');

  let html = `<table>
    <thead>
      <tr>
        <th>Operation</th>
        <th class="bf-val">Brute Force</th>
        <th class="kd-val">K-D Tree</th>
      </tr>
    </thead>
    <tbody>`;

  complexityData.forEach(row => {
    html += `<tr>
      <td>${row.operation}</td>
      <td class="bf-val">${row.brute_force}</td>
      <td class="kd-val">${row.kd_tree}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  tableEl.innerHTML = html;
}

/**
 * Dismisses the loading overlay after the scene is initialized.
 * @param {string} [text] - Optional final text to show before hiding
 */
export function hideLoadingOverlay(text = '') {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  if (!overlay) return;

  if (text && loadingText) {
    loadingText.textContent = text;
    setTimeout(() => overlay.classList.add('hidden'), 600);
  } else {
    overlay.classList.add('hidden');
  }
}

// ── Private Helpers ───────────────────────────────────────────

/**
 * Animates a numeric counter from its current value to a target value.
 * Uses requestAnimationFrame for a smooth count-up effect.
 * @param {string} id - Element ID
 * @param {number|string} target - Target value
 */
function _animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const targetNum = parseFloat(target);
  if (isNaN(targetNum)) {
    el.textContent = target;
    return;
  }

  const start   = parseFloat(el.textContent) || 0;
  const diff    = targetNum - start;
  const dur     = 350;
  const startTs = performance.now();

  function step(ts) {
    const progress = Math.min((ts - startTs) / dur, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = Math.round(start + diff * eased);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
