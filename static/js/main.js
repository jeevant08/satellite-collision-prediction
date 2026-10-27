// =============================================================
//  main.js — Member 4's File
//  TASK: App Bootstrap & Full Pipeline Orchestration
// =============================================================
//
//  SIMULATION PIPELINE SEQUENCE:
//    Step 1: generateSatellites(n)        — Member 1
//    Step 2: buildKDTree(satellites)      — Member 1
//    Step 3: radiusSearch() for each sat  — Member 1
//    Step 4: MaxHeap.insert(risk pairs)   — Member 1
//    Step 5: render2D & renderSatellites  — 2D Data Structure & 3D Space
//    Step 6: highlightRisks(topRisks)     — Visualizers
//    Step 7: updateRiskPanel(heap)        — Member 4
//    Step 8: runBenchmark(n)              — Member 3
//    Step 9: renderComparisonChart()      — Member 3 / Member 4
// =============================================================

import {
  init2DVisualizer,
  set2DSatellites,
  set2DTree,
  set2DRiskPairs,
  set2DPartitionDepth,
  focus2DNode,
  resetView,
  render2D
} from './visualizer2d.js';

import {
  initScene,
  renderSatellites,
  highlightRisks,
  showDangerRadiusSpheres,
  toggleAnimation,
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
let currentDepth       = 2;
let satelliteCount     = 250;
let lastRiskPairs      = [];
let lastRadius         = 800;
let showingRadii       = false;

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 2D Data Structure visualizer (Primary View)
  init2DVisualizer('canvas2d', 'treeHierarchyContainer');

  // 2. Initialize 3D Space Scene (Secondary Tab)
  initScene('canvas3d');

  // 3. Wire all control callbacks
  initControls({
    onGenerate:         handleGenerateSatellites,
    onSimulate:         handleSimulateCollision,
    onStepTree:         handleStepTreePlanes,
    onClearPlanes:      handleClearPlanes,
    onBenchmark:        handleRunBenchmark,
    onToggleAnimation:  handleToggleAnimation,
    onToggleRadii:      handleToggleRadii,
    onSwitchView:       handleSwitchView,
    onResetView:        handleResetView
  });

  // 4. Initial depth setting
  set2DPartitionDepth(currentDepth);
  updateDepthLabel(currentDepth);

  // 5. Dismiss loading overlay and auto-generate initial satellites
  hideLoadingOverlay('System Ready');
  handleGenerateSatellites(satelliteCount);
});

// ── Handlers ──────────────────────────────────────────────────

/**
 * STEP 1-2: Generates N orbital objects and rebuilds the K-D Tree.
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
    set2DSatellites([]);
    renderSatellites([]);
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(0, 0, null);
    updateComparisonStats(0);
    showStatusMessage('warning', 'Edge Case: N = 0. No orbital objects in space.');
    currentTreeData = null;
    return;
  }

  // Edge Case: N = 1
  if (count === 1) {
    showStatusMessage('info', 'Edge Case: N = 1. A single object cannot collide.');
  }

  setBtnLoading('btnGenerate', true);
  setSystemBusy(true, 'GENERATING...');

  try {
    const res = await fetch('/api/satellites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: count })
    });
    const data = await res.json();

    // Update 2D Data Structure visualizer
    set2DSatellites(data.satellites);

    // Update 3D scene
    renderSatellites(data.satellites);
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(data.count, 0, null);
    updateComparisonStats(data.count);

    // Fetch tree structure for K-D Tree partitioning
    await fetchTree();

    if (count > 1) {
      showStatusMessage('info', `Generated ${data.count} orbital objects. K-D Tree constructed.`);
    }
  } catch (err) {
    console.error('Error generating satellites:', err);
    showStatusMessage('warning', 'Backend offline. Run python app.py to connect server.');
  } finally {
    setBtnLoading('btnGenerate', false);
    setSystemBusy(false);
  }
}

/**
 * STEP 3-7: Runs K-D Tree radius search and Max-Heap ranking.
 * Risk pairs are rendered in the right panel, highlighted in 2D and 3D.
 * @param {number} radius - Danger threshold in km
 */
async function handleSimulateCollision(radius) {
  lastRadius = radius;

  // Edge Case: Danger radius = 0
  if (radius === 0) {
    set2DRiskPairs([], radius);
    highlightRisks([]);
    renderRiskList([]);
    lastRiskPairs = [];
    showingRadii  = false;
    setRadiiToggleVisible(false);
    updateLiveStats(satelliteCount, 0, null);
    showStatusMessage('info', 'Edge Case: Danger radius = 0 km. Proximity risks impossible.');
    return;
  }

  if (satelliteCount === 0) {
    showStatusMessage('warning', 'Generate objects first before running collision check.');
    return;
  }

  setBtnLoading('btnSimulate', true);
  setSystemBusy(true, 'SCANNING...');
  showStatusMessage('info', `Scanning spatial proximity within ${radius} km radius...`);

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius: radius })
    });
    const data = await res.json();

    lastRiskPairs = data.risk_pairs || [];

    // Step 5-6: Render in 2D and 3D visualizers
    set2DRiskPairs(lastRiskPairs, radius);
    highlightRisks(lastRiskPairs);

    // Step 7: Render right-panel risk cards with focus callback
    renderRiskList(data.top_risks, (sat1Id, sat2Id) => {
      focus2DNode(sat1Id);
      focusOnSatellite(sat1Id);
    });

    updateLiveStats(satelliteCount, data.total_risks, null);
    updateComparisonStats(satelliteCount);

    // Show radii toggle if there are risks
    setRadiiToggleVisible(lastRiskPairs.length > 0);
    updateRadiiToggleBtn(false);
    showingRadii = false;

    if (data.total_risks === 0) {
      showStatusMessage('info', 'All Clear — No collision threats detected within radius.');
    } else {
      showStatusMessage('warning', `Detected ${data.total_risks} proximity threat pair${data.total_risks > 1 ? 's' : ''} (ranked via Max-Heap).`);
    }
  } catch (err) {
    console.error('Error simulating collision:', err);
    showStatusMessage('warning', 'Simulation failed. Check backend algorithm execution.');
  } finally {
    setBtnLoading('btnSimulate', false);
    setSystemBusy(false);
  }
}

/**
 * Fetches the serialised K-D Tree from the backend.
 */
async function fetchTree() {
  try {
    const res = await fetch('/api/tree');
    const data = await res.json();
    currentTreeData = data.tree;

    // Send to 2D visualizer
    set2DTree(currentTreeData);

    // Update 3D split planes
    if (currentDepth > 0) {
      showSplittingPlanes(currentTreeData, currentDepth);
    }
  } catch (err) {
    console.warn('Could not fetch tree data:', err);
  }
}

/**
 * Steps through K-D Tree partitioning plane depths (cycles 0–4).
 */
function handleStepTreePlanes() {
  if (!currentTreeData) {
    showStatusMessage('warning', 'Generate objects first to build the K-D Tree.');
    return;
  }
  currentDepth = (currentDepth % 5) + 1;
  updateDepthLabel(currentDepth);

  // Update 2D spatial visualizer
  set2DPartitionDepth(currentDepth);

  // Update 3D visualizer
  showSplittingPlanes(currentTreeData, currentDepth);
}

/**
 * Resets all K-D Tree splitting partitions.
 */
function handleClearPlanes() {
  currentDepth = 0;
  updateDepthLabel(0);
  set2DPartitionDepth(0);
  clearPlanes();
}

/**
 * STEP 8-9: Executes benchmark suite and renders Chart.js graph.
 * @param {number} radius - Danger threshold in km
 */
async function handleRunBenchmark(radius) {
  setBtnLoading('btnRunBenchmark', true);
  setSystemBusy(true, 'BENCHMARKING...');
  showStatusMessage('info', 'Executing benchmark suite (N = 50 → 5000)...');

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

      showStatusMessage('info', 'Benchmark complete. Complexity proof chart updated.');
    } else if (data.error) {
      showStatusMessage('warning', `Benchmark pending: ${data.error}`);
    }
  } catch (err) {
    console.error('Benchmark failed:', err);
    showStatusMessage('warning', 'Benchmark runner error in python/analytics.py.');
  } finally {
    setBtnLoading('btnRunBenchmark', false);
    setSystemBusy(false);
  }
}

/**
 * Toggles simulation motion state.
 */
function handleToggleAnimation() {
  const isNowAnimating = toggleAnimation();
  updateAnimToggleBtn(isNowAnimating);
}

/**
 * Toggles danger radius indicators around at-risk objects.
 */
function handleToggleRadii() {
  if (lastRiskPairs.length === 0) return;

  showingRadii = !showingRadii;
  updateRadiiToggleBtn(showingRadii);

  if (showingRadii) {
    showDangerRadiusSpheres(lastRiskPairs, lastRadius);
  } else {
    showDangerRadiusSpheres([], lastRadius);
  }
}

/**
 * Handles switching viewport tabs (2D Map, 2D Tree, 3D Orbit).
 */
function handleSwitchView(mode) {
  if (mode === '2d-map') {
    render2D();
  }
}

/**
 * Resets 2D pan/zoom view.
 */
function handleResetView() {
  resetView();
  render2D();
}
