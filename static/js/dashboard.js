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
 * @param {Object} handlers - { onGenerate, onSimulate, onStepTree, onClearPlanes, onBenchmark }
 */
export function initControls(handlers) {
  const satSlider = document.getElementById('satelliteCount');
  const satVal = document.getElementById('satelliteCountVal');
  const radSlider = document.getElementById('dangerRadius');
  const radVal = document.getElementById('dangerRadiusVal');

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
}

/**
 * Updates the numerical stats displayed in the dashboard header.
 */
export function updateLiveStats(objectCount, riskCount, speedup) {
  const elObjects = document.getElementById('statObjectCount');
  const elRisks = document.getElementById('statRiskCount');
  const elSpeedup = document.getElementById('statSpeedup');

  if (elObjects) elObjects.textContent = objectCount;
  if (elRisks) elRisks.textContent = riskCount;
  if (elSpeedup) elSpeedup.textContent = speedup ? `${speedup}x` : '--';
}

/**
 * Renders the top 10 most critical collision risks extracted from the Max-Heap.
 * @param {Array} topRisks - Array of {sat1_name, sat2_name, distance}
 */
export function renderRiskList(topRisks) {
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
    card.innerHTML = `
      <div>
        <strong>#${idx + 1}</strong>
        <span>${risk.sat1_name} ↔ ${risk.sat2_name}</span>
      </div>
      <div class="risk-dist">${risk.distance} km</div>
    `;
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
 * Draws or updates the Chart.js line graph comparing Brute Force vs K-D Tree.
 * @param {Array} benchmarkData - Array of {n, bf_time_ms, kd_total_ms}
 */
export function renderComparisonChart(benchmarkData) {
  const ctx = document.getElementById('benchmarkChart')?.getContext('2d');
  if (!ctx || !benchmarkData || benchmarkData.length === 0) return;

  const labels = benchmarkData.map(d => d.n);
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
          tension: 0.3,
          fill: true,
          pointRadius: 4
        },
        {
          label: 'K-D Tree O(N log N)',
          data: kdTimes,
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79, 142, 247, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { family: 'Exo 2', size: 10 } }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Satellites (N)', color: '#64748b' },
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          title: { display: true, text: 'Time (ms)', color: '#64748b' },
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}
