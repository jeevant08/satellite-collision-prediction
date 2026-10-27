// =============================================================
//  main.js — Member 4's File
//  TASK: App Bootstrap & Full Pipeline Orchestration
// =============================================================
//
//  RUBRIC COVERAGE:
//    (c) Live Demo               — Complete working integration of all modules
//    (e) Individual Contribution — Member 4 orchestration pipeline
//
//  SIMULATION PIPELINE SEQUENCE:
//    Step 1: generateSatellites(n)        — Member 1
//    Step 2: buildKDTree(satellites)      — Member 1
//    Step 3: radiusSearch() for each sat  — Member 1
//    Step 4: MaxHeap.insert(risk pairs)   — Member 1
//    Step 5: renderSatellites(data)       — Member 2
//    Step 6: highlightRisks(topRisks)     — Member 2
//    Step 7: updateRiskPanel(heap)        — Member 4
//    Step 8: runBenchmark(n)              — Member 3
//    Step 9: renderComparisonChart()      — Member 3 / Member 4
//
//  HOW TO CONTRIBUTE:
//    git add static/js/main.js
//    git commit -m "[Member4] feat: wire main.js simulation pipeline and module orchestration"
// =============================================================

import {
  initScene,
  renderSatellites,
  highlightRisks,
  showDangerRadiusSpheres,
  toggleAnimation,
  getAnimationState,
  focusOnSatellite
} from './visualizer3d.js';

import { showSplittingPlanes, clearPlanes } from './treeVisualizer.js';

import {
  initControls,
  updateLiveStats,
  updateComparisonStats,
  renderRiskList,
  showStatusMessage,
  renderComparisonChart,
  renderComplexityTable,
  setSystemBusy,
  setBtnLoading,
  updateDepthLabel,
  updateAnimToggleBtn,
  setRadiiToggleVisible,
  updateRadiiToggleBtn,
  hideLoadingOverlay
} from './dashboard.js';

// ── App State ─────────────────────────────────────────────────
let currentTreeData    = null;
let currentDepth       = 0;
let satelliteCount     = 250;
let lastRiskPairs      = [];
let lastRadius         = 800;
let showingRadii       = false;

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D orbital space scene
  initScene('canvas3d');

  // 2. Wire all control callbacks
  initControls({
    onGenerate:         handleGenerateSatellites,
    onSimulate:         handleSimulateCollision,
    onStepTree:         handleStepTreePlanes,
    onClearPlanes:      handleClearPlanes,
    onBenchmark:        handleRunBenchmark,
    onToggleAnimation:  handleToggleAnimation,
    onToggleRadii:      handleToggleRadii
  });

  // 3. Dismiss loading overlay and auto-generate initial satellites
  hideLoadingOverlay('System Ready');
  handleGenerateSatellites(satelliteCount);
});

// ── Handlers ──────────────────────────────────────────────────

/**
 * STEP 1-2: Generates N satellites and rebuilds the K-D Tree.
 * Edge cases N=0 and N=1 are handled explicitly.
 * @param {number} count
 */
async function handleGenerateSatellites(count) {
  satelliteCount = count;
  lastRiskPairs  = [];
  showingRadii   = false;
  setRadiiToggleVisible(false);

  // Edge Case: N = 0
  if (count === 0) {
    renderSatellites([]);
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(0, 0, null);
    updateComparisonStats(0);
    showStatusMessage('warning', '⚠ Edge Case: N = 0. No satellites in orbit.');
    currentTreeData = null;
    return;
  }

  // Edge Case: N = 1
  if (count === 1) {
    showStatusMessage('info', 'Edge Case: N = 1. A single satellite cannot collide.');
  }

  setBtnLoading('btnGenerate', true);
  setSystemBusy(true, 'GENERATING…');

  try {
    const res = await fetch('/api/satellites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: count })
    });
    const data = await res.json();

    renderSatellites(data.satellites);
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(data.count, 0, null);
    updateComparisonStats(data.count);

    // Fetch tree structure for visualizer
    await fetchTree();

    if (count > 1) {
      showStatusMessage('info', `✓ Generated ${data.count} orbital objects. K-D Tree built.`);
    }
  } catch (err) {
    console.error('Error generating satellites:', err);
    showStatusMessage('warning', '⚡ Backend offline. Run `python app.py` to start the server.');
  } finally {
    setBtnLoading('btnGenerate', false);
    setSystemBusy(false);
  }
}

/**
 * STEP 3-7: Runs K-D Tree radius search and Max-Heap ranking.
 * Risk pairs are rendered in the right panel and highlighted in 3D.
 * @param {number} radius - Danger threshold in km
 */
async function handleSimulateCollision(radius) {
  lastRadius = radius;

  // Edge Case: Danger radius = 0
  if (radius === 0) {
    highlightRisks([]);
    renderRiskList([]);
    lastRiskPairs = [];
    showingRadii  = false;
    setRadiiToggleVisible(false);
    updateLiveStats(satelliteCount, 0, null);
    showStatusMessage('info', 'Edge Case: Danger radius = 0 km. No proximity risks possible.');
    return;
  }

  if (satelliteCount === 0) {
    showStatusMessage('warning', 'Generate satellites first before running the collision check.');
    return;
  }

  setBtnLoading('btnSimulate', true);
  setSystemBusy(true, 'SCANNING…');
  showStatusMessage('info', `Scanning spatial proximity within ${radius} km…`);

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius: radius })
    });
    const data = await res.json();

    lastRiskPairs = data.risk_pairs || [];

    // Step 5-6: Render 3D highlights
    highlightRisks(lastRiskPairs);

    // Step 7: Render right-panel risk cards with camera-focus callback
    renderRiskList(data.top_risks, (sat1Id, sat2Id) => {
      focusOnSatellite(sat1Id);
    });

    updateLiveStats(satelliteCount, data.total_risks, null);
    updateComparisonStats(satelliteCount);

    // Show radii toggle if there are risks
    setRadiiToggleVisible(lastRiskPairs.length > 0);
    updateRadiiToggleBtn(false);
    showingRadii = false;

    if (data.total_risks === 0) {
      showStatusMessage('info', '✓ All Clear — No collision threats detected within radius.');
    } else {
      showStatusMessage('warning', `🚨 Detected ${data.total_risks} critical proximity pair${data.total_risks > 1 ? 's' : ''}!`);
    }
  } catch (err) {
    console.error('Error simulating collision:', err);
    showStatusMessage('warning', '⚠ Simulation failed. Ensure backend algorithms are implemented.');
  } finally {
    setBtnLoading('btnSimulate', false);
    setSystemBusy(false);
  }
}

/**
 * Fetches the serialised K-D Tree from the backend for split-plane visualization.
 */
async function fetchTree() {
  try {
    const res = await fetch('/api/tree');
    const data = await res.json();
    currentTreeData = data.tree;
  } catch (err) {
    console.warn('Could not fetch tree data:', err);
  }
}

/**
 * Steps through K-D Tree partitioning plane depths (cycles 0–4).
 * Updates the depth badge with the active split axis (X/Y/Z).
 */
function handleStepTreePlanes() {
  if (!currentTreeData) {
    showStatusMessage('warning', 'Generate satellites first to build the K-D Tree.');
    return;
  }
  currentDepth = (currentDepth % 5) + 1;
  updateDepthLabel(currentDepth);
  showSplittingPlanes(currentTreeData, currentDepth);
}

/**
 * Resets all K-D Tree splitting planes from the 3D viewport.
 */
function handleClearPlanes() {
  currentDepth = 0;
  updateDepthLabel(0);
  clearPlanes();
}

/**
 * STEP 8-9: Executes the full benchmarking suite and renders the Chart.js graph.
 * @param {number} radius - Danger threshold in km
 */
async function handleRunBenchmark(radius) {
  setBtnLoading('btnRunBenchmark', true);
  setSystemBusy(true, 'BENCHMARKING…');
  showStatusMessage('info', 'Running benchmark suite (N = 50 → 5000)… This may take a moment.');

  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius: radius })
    });
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      // Step 9: Render Chart.js comparison graph
      renderComparisonChart(data.results);

      // Render complexity table if provided
      if (data.complexity_table) {
        renderComplexityTable(data.complexity_table);
      }

      // Update speedup from the largest N result
      const last = data.results[data.results.length - 1];
      if (last && last.speedup) {
        updateLiveStats(satelliteCount, lastRiskPairs.length, Math.round(last.speedup));
      }

      showStatusMessage('info', '✓ Benchmark completed. Complexity proof chart updated.');
    } else if (data.error) {
      showStatusMessage('warning', `Benchmark pending: ${data.error}`);
    }
  } catch (err) {
    console.error('Benchmark failed:', err);
    showStatusMessage('warning', '⚠ Benchmark runner not yet implemented in python/analytics.py.');
  } finally {
    setBtnLoading('btnRunBenchmark', false);
    setSystemBusy(false);
  }
}

/**
 * Toggles orbit animation on/off.
 * Updates the button label to reflect the current state.
 */
function handleToggleAnimation() {
  const isNowAnimating = toggleAnimation();
  updateAnimToggleBtn(isNowAnimating);
}

/**
 * Toggles danger radius sphere visualization around at-risk satellites.
 * Only available after a simulation has been run.
 */
function handleToggleRadii() {
  if (lastRiskPairs.length === 0) return;

  showingRadii = !showingRadii;
  updateRadiiToggleBtn(showingRadii);

  if (showingRadii) {
    showDangerRadiusSpheres(lastRiskPairs, lastRadius);
  } else {
    // Clear: pass empty array to clear
    showDangerRadiusSpheres([], lastRadius);
  }
}
