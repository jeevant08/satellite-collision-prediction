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

import { initScene, renderSatellites, highlightRisks } from './visualizer3d.js';
import { showSplittingPlanes, clearPlanes } from './treeVisualizer.js';
import { 
  initControls, 
  updateLiveStats, 
  renderRiskList, 
  showStatusMessage, 
  renderComparisonChart 
} from './dashboard.js';

let currentTreeData = null;
let currentDepth = 0;
let satelliteCount = 250;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D orbital space scene
  initScene('canvas3d');

  // 2. Wire control callbacks
  initControls({
    onGenerate: handleGenerateSatellites,
    onSimulate: handleSimulateCollision,
    onStepTree: handleStepTreePlanes,
    onClearPlanes: handleClearPlanes,
    onBenchmark: handleRunBenchmark
  });

  // 3. Initial generation on load
  handleGenerateSatellites(satelliteCount);
});

/**
 * Handles satellite generation API call.
 */
async function handleGenerateSatellites(count) {
  satelliteCount = count;
  showStatusMessage('info', `Generating ${count} orbital objects...`);
  
  // Edge Case: N = 0
  if (count === 0) {
    renderSatellites([]);
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(0, 0, '--');
    showStatusMessage('warning', 'Edge Case: N = 0. No satellites in orbit.');
    return;
  }

  // Edge Case: N = 1
  if (count === 1) {
    showStatusMessage('info', 'Edge Case: N = 1. A single satellite cannot collide.');
  }

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
    updateLiveStats(data.count, 0, '--');
    
    // Fetch tree structure for visualizer
    fetchTree();
    
    if (count > 1) {
      showStatusMessage('info', `Successfully generated ${data.count} satellites.`);
    }
  } catch (err) {
    console.error('Error generating satellites:', err);
    showStatusMessage('warning', 'Backend connection pending. Run `python app.py`.');
  }
}

/**
 * Executes collision detection via K-D Tree & Max-Heap ranking.
 */
async function handleSimulateCollision(radius) {
  // Edge Case: Danger radius = 0
  if (radius === 0) {
    highlightRisks([]);
    renderRiskList([]);
    updateLiveStats(satelliteCount, 0, '--');
    showStatusMessage('info', 'Danger radius is 0 km. No proximity risks detected.');
    return;
  }

  showStatusMessage('info', `Scanning spatial proximity within ${radius} km radius...`);

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius: radius })
    });
    const data = await res.json();

    highlightRisks(data.risk_pairs);
    renderRiskList(data.top_risks);
    updateLiveStats(satelliteCount, data.total_risks, '--');

    if (data.total_risks === 0) {
      showStatusMessage('info', 'All Clear — No collision threats detected within radius.');
    } else {
      showStatusMessage('warning', `Detected ${data.total_risks} critical proximity pairs!`);
    }
  } catch (err) {
    console.error('Error simulating collision:', err);
    showStatusMessage('warning', 'Simulation failed. Check backend algorithm implementation.');
  }
}

/**
 * Fetches the serialised K-D Tree from backend.
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
 * Steps through K-D Tree partitioning plane depths.
 */
function handleStepTreePlanes() {
  if (!currentTreeData) {
    showStatusMessage('warning', 'Generate satellites first to build the K-D Tree.');
    return;
  }
  currentDepth = (currentDepth + 1) % 5;
  document.getElementById('currentDepthLabel').textContent = currentDepth;
  showSplittingPlanes(currentTreeData, currentDepth);
}

/**
 * Clears splitting planes from viewport.
 */
function handleClearPlanes() {
  currentDepth = 0;
  document.getElementById('currentDepthLabel').textContent = 0;
  clearPlanes();
}

/**
 * Executes full benchmarking suite comparing Brute Force vs K-D Tree.
 */
async function handleRunBenchmark(radius) {
  showStatusMessage('info', 'Running complexity benchmark suite (N=50 to 5000)...');
  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius: radius })
    });
    const data = await res.json();

    if (data.results) {
      renderComparisonChart(data.results);
      const last = data.results[data.results.length - 1];
      if (last && last.speedup) {
        updateLiveStats(satelliteCount, 0, Math.round(last.speedup));
      }
      showStatusMessage('info', 'Benchmark completed. Complexity proof chart updated.');
    } else if (data.error) {
      showStatusMessage('warning', `Benchmark pending: ${data.error}`);
    }
  } catch (err) {
    console.error('Benchmark failed:', err);
    showStatusMessage('warning', 'Benchmark runner pending in python/analytics.py.');
  }
}
