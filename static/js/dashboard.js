// =============================================================
//  dashboard.js — Member 4's File
//  TASK: UI Controls, Risk Cards, Live Metrics, & Chart.js Graph
// =============================================================

let benchmarkChartInstance = null;
let currentViewMode = '2d-map';

/**
 * Initializes slider value listeners and connects buttons to callback handlers.
 * @param {Object} handlers - { onGenerate, onSimulate, onStepTree, onClearPlanes,
 *                              onBenchmark, onToggleAnimation, onToggleRadii,
 *                              onSwitchView, onResetView }
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

  document.getElementById('btnResetView')?.addEventListener('click', () => {
    if (handlers.onResetView) handlers.onResetView();
  });

  // View Tab Switchers
  const tabs = document.querySelectorAll('.view-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.getAttribute('data-view');
      currentViewMode = mode;
      switchViewMode(mode);
      if (handlers.onSwitchView) handlers.onSwitchView(mode);
    });
  });
}

/**
 * Switches visibility among 2D Map, 2D Tree Hierarchy, and 3D Orbit Viewports.
 */
export function switchViewMode(mode) {
  const c2d = document.getElementById('canvas2d');
  const treeC = document.getElementById('treeHierarchyContainer');
  const c3d = document.getElementById('canvas3d');
  const fitBtn = document.getElementById('btnResetView');
  const hud = document.querySelector('.viewport-hud');

  if (mode === '2d-map') {
    c2d?.classList.remove('hidden');
    treeC?.classList.add('hidden');
    c3d?.classList.add('hidden');
    if (fitBtn) fitBtn.style.display = 'inline-block';
    if (hud) hud.style.display = 'block';
  } else if (mode === '2d-tree') {
    c2d?.classList.add('hidden');
    treeC?.classList.remove('hidden');
    c3d?.classList.add('hidden');
    if (fitBtn) fitBtn.style.display = 'none';
    if (hud) hud.style.display = 'none';
  } else if (mode === '3d-orbit') {
    c2d?.classList.add('hidden');
    treeC?.classList.add('hidden');
    c3d?.classList.remove('hidden');
    if (fitBtn) fitBtn.style.display = 'none';
    if (hud) hud.style.display = 'block';
  }
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

  const elSpeedup = document.getElementById('statSpeedup');
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
 * Cards are clickable — clicking focuses both the 2D visualizer and 3D camera.
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
        <p>All Clear — No proximity threats detected within radius.</p>
      </div>`;
    return;
  }

  topRisks.forEach((risk, idx) => {
    const card = document.createElement('div');
    card.className = 'risk-card';
    card.title = 'Click to inspect this pair in visualizer';
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

        document.querySelectorAll('.risk-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    }

    container.appendChild(card);
  });
}

/**
 * Displays status messages or warnings for edge cases without emojis.
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
 * @param {string} label - e.g. "PROCESSING..." or "SYSTEM READY"
 */
export function setSystemBusy(isBusy, label = '') {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');

  if (dot) {
    dot.className = isBusy ? 'status-dot busy' : 'status-dot online';
  }
  if (text) {
    text.textContent = label || (isBusy ? 'PROCESSING...' : 'SYSTEM READY');
  }
}

/**
 * Sets a button into loading state (or restores it).
 * @param {string} id - Button element ID
 * @param {boolean} isLoading
 */
export function setBtnLoading(id, isLoading) {
  const btn = document.getElementById(id);
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.textContent = 'Processing...';
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
    axisEl.textContent = depth > 0 ? axes[(depth - 1) % 3] : 'None';
  }
}

/**
 * Updates the simulation toggle button label without emojis.
 * @param {boolean} isAnimating
 */
export function updateAnimToggleBtn(isAnimating) {
  const label = document.getElementById('animToggleLabel');
  if (label) {
    label.textContent = isAnimating ? 'Pause Simulation' : 'Resume Simulation';
  }
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
 * Updates the radii toggle button label without emojis.
 * @param {boolean} showing
 */
export function updateRadiiToggleBtn(showing) {
  const label = document.getElementById('radiiToggleLabel');
  if (label) label.textContent = showing ? 'Hide Danger Radii' : 'Show Danger Radii';
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
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          tension: 0.25,
          fill: true,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ef4444',
          borderWidth: 1.8
        },
        {
          label: 'K-D Tree O(N log N)',
          data: kdTimes,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          tension: 0.25,
          fill: true,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#3b82f6',
          borderWidth: 1.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 10 },
            boxWidth: 10,
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: '#334155',
          borderWidth: 1,
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          padding: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} ms`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Objects (N)', color: '#64748b', font: { size: 9 } },
          ticks: { color: '#94a3b8', font: { size: 9, family: 'JetBrains Mono' } },
          grid:  { color: '#1e293b' }
        },
        y: {
          title: { display: true, text: 'Time (ms)', color: '#64748b', font: { size: 9 } },
          ticks: { color: '#94a3b8', font: { size: 9, family: 'JetBrains Mono' } },
          grid:  { color: '#1e293b' }
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
 * @param {string} [text] - Optional text before hiding
 */
export function hideLoadingOverlay(text = '') {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  if (!overlay) return;

  if (text && loadingText) {
    loadingText.textContent = text;
    setTimeout(() => overlay.classList.add('hidden'), 400);
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * Animates a numeric counter.
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
  const dur     = 250;
  const startTs = performance.now();

  function step(ts) {
    const progress = Math.min((ts - startTs) / dur, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(start + diff * eased);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
