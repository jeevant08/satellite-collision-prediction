// =============================================================
//  visualizer2d.js
//  TASK: 2D Data Structure Visualizer for K-D Tree & Collision Risks
// =============================================================
//
//  Directly visualizes the K-D Tree data structure in 2D:
//    1. 2D Spatial Partition Map:
//       - Plots Satellites (squares), Debris (circles), and Rocket bodies (triangles)
//       - Visualizes K-D Tree median split lines (X-axis in blue, Y-axis in emerald)
//       - Highlights collision risk pairs (lines and distance labels)
//       - Demonstrates K-D Tree radius search and BRANCH PRUNING:
//         shows traversed search paths and shaded pruned regions (|Δ| > R)
//    2. 2D Tree Hierarchy Graph:
//       - Visualizes the binary tree structure with nodes, split axes, and branches
//       - Explicitly marks each node as Satellite / Debris / Rocket
//       - Shows which subtrees are visited vs pruned during collision search
// =============================================================

let canvas2d = null;
let ctx2d = null;
let hierarchyContainer = null;

// Simulation State
let satellitesList = [];
let treeRoot = null;
let riskPairsList = [];
let dangerRadius = 800;
let partitionDepth = 2;
let selectedNodeId = null;
let searchStats = null;

// Camera Pan & Zoom state
let zoom = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Coordinate bounds (km)
const BOUND = 10000;

// Tooltip element
let tooltip2d = null;
let hoveredNode = null;

// Color Palette (Clean, professional, academic, NO neon glowing effects)
const COLORS = {
  bg: '#0a0e17',
  grid: '#1b2434',
  axis: '#2d3b52',
  textMain: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',

  // Node types
  satellite: '#3b82f6', // Solid blue
  debris: '#94a3b8',    // Slate neutral
  rocket: '#f59e0b',    // Solid amber

  // Collision threat
  risk: '#ef4444',      // Crisp crimson
  riskBg: 'rgba(239, 68, 68, 0.12)',

  // K-D Tree Partition Lines
  splitX: '#3b82f6',    // Blue
  splitY: '#10b981',    // Emerald green
  splitZ: '#8b5cf6',    // Purple

  // Search & Pruning
  searchRadius: 'rgba(59, 130, 246, 0.25)',
  searchRadiusBorder: '#3b82f6',
  prunedRegion: 'rgba(239, 68, 68, 0.08)',
  prunedBorder: 'rgba(239, 68, 68, 0.35)',
  visitedNode: '#38bdf8',
  visitedLine: '#38bdf8'
};

/**
 * Initializes the 2D visualizer canvas, listeners, and containers.
 */
export function init2DVisualizer(canvasId, hierarchyContainerId) {
  canvas2d = document.getElementById(canvasId);
  hierarchyContainer = document.getElementById(hierarchyContainerId);
  if (!canvas2d) return;

  ctx2d = canvas2d.getContext('2d');

  // Resize canvas to fill container with devicePixelRatio sharpness
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    render2D();
  });

  // Create Tooltip
  createTooltip();

  // Mouse Listeners for Pan, Zoom, Hover, and Click
  canvas2d.addEventListener('mousedown', onMouseDown);
  canvas2d.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas2d.addEventListener('wheel', onWheel, { passive: false });
  canvas2d.addEventListener('click', onClick);

  // Initial render
  resetView();
  render2D();
}

/**
 * Updates canvas size to match parent element.
 */
function resizeCanvas() {
  if (!canvas2d) return;
  const rect = canvas2d.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas2d.width = rect.width * dpr;
  canvas2d.height = rect.height * dpr;
  canvas2d.style.width = `${rect.width}px`;
  canvas2d.style.height = `${rect.height}px`;
}

/**
 * Resets camera pan and zoom to fit the [-BOUND, BOUND] space.
 */
export function resetView() {
  if (!canvas2d) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas2d.width / dpr;
  const h = canvas2d.height / dpr;
  const minDim = Math.min(w, h);
  // Fit 20,000 km universe inside minDim with padding
  zoom = (minDim * 0.88) / (BOUND * 2);
  panX = w / 2;
  panY = h / 2;
}

/**
 * Creates the DOM tooltip for node inspection.
 */
function createTooltip() {
  if (tooltip2d) return;
  tooltip2d = document.createElement('div');
  tooltip2d.className = 'node-tooltip-2d';
  tooltip2d.style.cssText = `
    position: absolute;
    display: none;
    pointer-events: none;
    background: #111827;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: #f1f5f9;
    z-index: 1000;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;
  document.body.appendChild(tooltip2d);
}

// ── Coordinate Mapping Functions ─────────────────────────────
function worldToScreen(x, y) {
  return {
    x: panX + x * zoom,
    y: panY - y * zoom // Invert Y so positive Y is up
  };
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - panX) / zoom,
    y: (panY - sy) / zoom
  };
}

// ── Data Update Methods ──────────────────────────────────────
export function set2DSatellites(satellites) {
  satellitesList = satellites || [];
  selectedNodeId = null;
  searchStats = null;
  render2D();
  renderTreeHierarchy();
}

export function set2DTree(tree) {
  treeRoot = tree || null;
  render2D();
  renderTreeHierarchy();
}

export function set2DRiskPairs(pairs, radius) {
  riskPairsList = pairs || [];
  if (radius !== undefined) dangerRadius = radius;
  render2D();
  renderTreeHierarchy();
}

export function set2DPartitionDepth(depth) {
  partitionDepth = depth;
  render2D();
  renderTreeHierarchy();
}

export function focus2DNode(satId) {
  selectedNodeId = satId;
  const target = satellitesList.find(s => s.id === satId);
  if (target) {
    // Center view on this node
    const dpr = window.devicePixelRatio || 1;
    const w = canvas2d.width / dpr;
    const h = canvas2d.height / dpr;
    panX = w / 2 - target.x * zoom;
    panY = h / 2 + target.y * zoom;
    runPruningAnalysis(target);
  }
  render2D();
  renderTreeHierarchy();
}

// ── Main 2D Canvas Render Loop ───────────────────────────────
export function render2D() {
  if (!ctx2d || !canvas2d) return;

  const dpr = window.devicePixelRatio || 1;
  ctx2d.save();
  ctx2d.scale(dpr, dpr);

  const width = canvas2d.width / dpr;
  const height = canvas2d.height / dpr;

  // 1. Background
  ctx2d.fillStyle = COLORS.bg;
  ctx2d.fillRect(0, 0, width, height);

  // 2. Coordinate Grid & Bounding Universe
  drawGridAndBounds(width, height);

  // 3. K-D Tree Partition Lines & Pruned Regions
  if (treeRoot && partitionDepth > 0) {
    drawKDTreePartitions();
  }

  // 4. Branch Pruning Visualization (if node selected)
  if (selectedNodeId !== null) {
    drawPruningOverlay();
  }

  // 5. Collision Risk Connectors (< dangerRadius)
  drawCollisionRiskVectors();

  // 6. Draw Nodes (Satellites vs Debris vs Rockets)
  drawNodes();

  ctx2d.restore();
}

/**
 * Draws coordinate axes, universe bounding box, and tick marks.
 */
function drawGridAndBounds(width, height) {
  const origin = worldToScreen(0, 0);

  // Grid lines
  ctx2d.strokeStyle = COLORS.grid;
  ctx2d.lineWidth = 1;

  const step = 2500;
  for (let c = -BOUND; c <= BOUND; c += step) {
    if (c === 0) continue;
    // Vertical grid
    const pTop = worldToScreen(c, BOUND);
    const pBottom = worldToScreen(c, -BOUND);
    ctx2d.beginPath();
    ctx2d.moveTo(pTop.x, pTop.y);
    ctx2d.lineTo(pBottom.x, pBottom.y);
    ctx2d.stroke();

    // Horizontal grid
    const pLeft = worldToScreen(-BOUND, c);
    const pRight = worldToScreen(BOUND, c);
    ctx2d.beginPath();
    ctx2d.moveTo(pLeft.x, pLeft.y);
    ctx2d.lineTo(pRight.x, pRight.y);
    ctx2d.stroke();
  }

  // Bounding Universe Box (±10,000 km)
  const topLeft = worldToScreen(-BOUND, BOUND);
  const bottomRight = worldToScreen(BOUND, -BOUND);
  ctx2d.strokeStyle = '#334155';
  ctx2d.lineWidth = 1.5;
  ctx2d.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

  // Universe boundary label
  ctx2d.fillStyle = COLORS.textDim;
  ctx2d.font = '10px "JetBrains Mono", monospace';
  ctx2d.fillText('±10,000 km Orbital Universe Boundary', topLeft.x + 8, topLeft.y + 16);

  // Main Axes (X=0, Y=0)
  ctx2d.strokeStyle = COLORS.axis;
  ctx2d.lineWidth = 1.5;

  // X Axis
  ctx2d.beginPath();
  ctx2d.moveTo(topLeft.x, origin.y);
  ctx2d.lineTo(bottomRight.x, origin.y);
  ctx2d.stroke();

  // Y Axis
  ctx2d.beginPath();
  ctx2d.moveTo(origin.x, topLeft.y);
  ctx2d.lineTo(origin.x, bottomRight.y);
  ctx2d.stroke();

  // Axis Labels
  ctx2d.fillStyle = COLORS.textDim;
  ctx2d.fillText('X (km)', bottomRight.x - 40, origin.y - 6);
  ctx2d.fillText('Y (km)', origin.x + 6, topLeft.y + 14);
}

/**
 * Draws K-D Tree partition split lines recursively in 2D.
 */
function drawKDTreePartitions() {
  function traverse(node, depth, xMin, xMax, yMin, yMax) {
    if (!node || depth > partitionDepth) return;

    const { x, y } = node.point;
    const axis = node.axis;

    if (axis === 'x') {
      // Vertical split line at x = node.point.x bounded by [yMin, yMax]
      const p1 = worldToScreen(x, yMax);
      const p2 = worldToScreen(x, yMin);

      ctx2d.strokeStyle = COLORS.splitX;
      ctx2d.lineWidth = Math.max(1, 2.5 - depth * 0.4);
      ctx2d.setLineDash([6, 3]);
      ctx2d.beginPath();
      ctx2d.moveTo(p1.x, p1.y);
      ctx2d.lineTo(p2.x, p2.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // Split label on line
      if (depth <= 3) {
        ctx2d.fillStyle = COLORS.splitX;
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.fillText(`X=${Math.round(x)} [L${depth}]`, p1.x + 4, p1.y + 14);
      }

      // Recurse left (x < median) and right (x > median)
      traverse(node.left, depth + 1, xMin, x, yMin, yMax);
      traverse(node.right, depth + 1, x, xMax, yMin, yMax);

    } else if (axis === 'y') {
      // Horizontal split line at y = node.point.y bounded by [xMin, xMax]
      const p1 = worldToScreen(xMin, y);
      const p2 = worldToScreen(xMax, y);

      ctx2d.strokeStyle = COLORS.splitY;
      ctx2d.lineWidth = Math.max(1, 2.5 - depth * 0.4);
      ctx2d.setLineDash([6, 3]);
      ctx2d.beginPath();
      ctx2d.moveTo(p1.x, p1.y);
      ctx2d.lineTo(p2.x, p2.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // Split label on line
      if (depth <= 3) {
        ctx2d.fillStyle = COLORS.splitY;
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.fillText(`Y=${Math.round(y)} [L${depth}]`, p1.x + 6, p1.y - 4);
      }

      // Recurse left (y < median) and right (y > median)
      traverse(node.left, depth + 1, xMin, xMax, yMin, y);
      traverse(node.right, depth + 1, xMin, xMax, y, yMax);
    } else {
      // Z split in 3D: in 2D space map, step into subtrees preserving 2D bounds
      traverse(node.left, depth + 1, xMin, xMax, yMin, yMax);
      traverse(node.right, depth + 1, xMin, xMax, yMin, yMax);
    }
  }

  traverse(treeRoot, 0, -BOUND, BOUND, -BOUND, BOUND);
}

/**
 * Draws all orbital nodes (Satellites, Debris, Rockets) with distinct shapes and labels.
 */
function drawNodes() {
  const riskSet = new Set();
  riskPairsList.forEach(p => {
    riskSet.add(p.sat1_id);
    riskSet.add(p.sat2_id);
  });

  satellitesList.forEach(sat => {
    const screen = worldToScreen(sat.x, sat.y);
    const isRisk = riskSet.has(sat.id);
    const isSelected = selectedNodeId === sat.id;

    const baseSize = Math.max(4, Math.min(10, 6 * Math.sqrt(zoom)));

    // Highlight selected query node
    if (isSelected) {
      ctx2d.strokeStyle = '#f8fafc';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(screen.x, screen.y, baseSize + 6, 0, Math.PI * 2);
      ctx2d.stroke();
    }

    if (sat.type === 'active') {
      // SATELLITE: Rendered as a distinct square
      const s = baseSize * 1.5;
      ctx2d.fillStyle = isRisk ? COLORS.risk : COLORS.satellite;
      ctx2d.fillRect(screen.x - s / 2, screen.y - s / 2, s, s);

      if (isRisk) {
        ctx2d.strokeStyle = '#ffffff';
        ctx2d.lineWidth = 1.2;
        ctx2d.strokeRect(screen.x - s / 2, screen.y - s / 2, s, s);
      }

    } else if (sat.type === 'debris') {
      // DEBRIS: Rendered as a distinct circle
      ctx2d.fillStyle = isRisk ? COLORS.risk : COLORS.debris;
      ctx2d.beginPath();
      ctx2d.arc(screen.x, screen.y, baseSize * 0.85, 0, Math.PI * 2);
      ctx2d.fill();

      if (isRisk) {
        ctx2d.strokeStyle = '#ffffff';
        ctx2d.lineWidth = 1.2;
        ctx2d.stroke();
      }

    } else {
      // ROCKET BODY: Rendered as a distinct upward triangle
      const r = baseSize * 1.2;
      ctx2d.fillStyle = isRisk ? COLORS.risk : COLORS.rocket;
      ctx2d.beginPath();
      ctx2d.moveTo(screen.x, screen.y - r);
      ctx2d.lineTo(screen.x + r * 0.86, screen.y + r * 0.5);
      ctx2d.lineTo(screen.x - r * 0.86, screen.y + r * 0.5);
      ctx2d.closePath();
      ctx2d.fill();

      if (isRisk) {
        ctx2d.strokeStyle = '#ffffff';
        ctx2d.lineWidth = 1.2;
        ctx2d.stroke();
      }
    }

    // Node labels when zoomed in or when N is small (N <= 150)
    if (satellitesList.length <= 150 || zoom > 0.08 || isRisk || isSelected) {
      ctx2d.fillStyle = isRisk ? COLORS.risk : (isSelected ? '#f8fafc' : COLORS.textDim);
      ctx2d.font = '9px "JetBrains Mono", monospace';
      ctx2d.fillText(sat.name, screen.x + baseSize + 2, screen.y + 3);
    }
  });
}

/**
 * Draws red collision risk vectors connecting pairs within danger radius.
 */
function drawCollisionRiskVectors() {
  if (!riskPairsList || riskPairsList.length === 0) return;

  const satMap = new Map();
  satellitesList.forEach(s => satMap.set(s.id, s));

  riskPairsList.forEach(pair => {
    const s1 = satMap.get(pair.sat1_id);
    const s2 = satMap.get(pair.sat2_id);
    if (!s1 || !s2) return;

    const p1 = worldToScreen(s1.x, s1.y);
    const p2 = worldToScreen(s2.x, s2.y);

    // Red vector line
    ctx2d.strokeStyle = COLORS.risk;
    ctx2d.lineWidth = 1.8;
    ctx2d.beginPath();
    ctx2d.moveTo(p1.x, p1.y);
    ctx2d.lineTo(p2.x, p2.y);
    ctx2d.stroke();

    // Distance label badge at midpoint
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const label = `${Math.round(pair.distance)} km`;
    ctx2d.font = '9px "JetBrains Mono", monospace';
    const textWidth = ctx2d.measureText(label).width;

    ctx2d.fillStyle = '#1e1b2e';
    ctx2d.fillRect(midX - textWidth / 2 - 3, midY - 7, textWidth + 6, 14);
    ctx2d.strokeStyle = COLORS.risk;
    ctx2d.lineWidth = 1;
    ctx2d.strokeRect(midX - textWidth / 2 - 3, midY - 7, textWidth + 6, 14);

    ctx2d.fillStyle = COLORS.risk;
    ctx2d.fillText(label, midX - textWidth / 2, midY + 4);
  });
}

/**
 * Simulates K-D Tree radius search and identifies visited vs pruned subtrees.
 */
function runPruningAnalysis(target) {
  if (!treeRoot || !target) return;

  let visitedCount = 0;
  let prunedCount = 0;
  const visitedPath = [];
  const prunedBoxes = [];

  function traverse(node, depth, xMin, xMax, yMin, yMax) {
    if (!node) return;

    visitedCount++;
    const { x, y } = node.point;
    visitedPath.push({ x, y, id: node.point.id });

    const axis = node.axis;
    const targetVal = target[axis];
    const nodeVal = node.point[axis];
    const axisDist = Math.abs(targetVal - nodeVal);

    // Near and Far subtrees
    let near, far;
    let nearBox, farBox;

    if (axis === 'x') {
      if (targetVal < nodeVal) {
        near = node.left;
        far = node.right;
        nearBox = [xMin, x, yMin, yMax];
        farBox  = [x, xMax, yMin, yMax];
      } else {
        near = node.right;
        far = node.left;
        nearBox = [x, xMax, yMin, yMax];
        farBox  = [xMin, x, yMin, yMax];
      }
    } else if (axis === 'y') {
      if (targetVal < nodeVal) {
        near = node.left;
        far = node.right;
        nearBox = [xMin, xMax, yMin, y];
        farBox  = [xMin, xMax, y, yMax];
      } else {
        near = node.right;
        far = node.left;
        nearBox = [xMin, xMax, y, yMax];
        farBox  = [xMin, xMax, yMin, y];
      }
    } else {
      near = targetVal < nodeVal ? node.left : node.right;
      far  = targetVal < nodeVal ? node.right : node.left;
      nearBox = [xMin, xMax, yMin, yMax];
      farBox  = [xMin, xMax, yMin, yMax];
    }

    // Always search near subtree
    traverse(near, depth + 1, nearBox[0], nearBox[1], nearBox[2], nearBox[3]);

    // Pruning check: recurse into far subtree ONLY if axis distance <= dangerRadius
    if (axisDist <= dangerRadius) {
      traverse(far, depth + 1, farBox[0], farBox[1], farBox[2], farBox[3]);
    } else {
      // Entire far subtree is PRUNED!
      prunedCount += countSubtreeNodes(far);
      prunedBoxes.push({
        box: farBox,
        axis: axis,
        axisDist: Math.round(axisDist),
        splitVal: Math.round(nodeVal)
      });
    }
  }

  traverse(treeRoot, 0, -BOUND, BOUND, -BOUND, BOUND);

  searchStats = {
    target: target,
    visitedCount,
    prunedCount,
    totalNodes: satellitesList.length,
    visitedPath,
    prunedBoxes
  };

  updateInspectorHUD();
}

function countSubtreeNodes(node) {
  if (!node) return 0;
  return 1 + countSubtreeNodes(node.left) + countSubtreeNodes(node.right);
}

/**
 * Draws the branch pruning visual overlay on the 2D canvas.
 */
function drawPruningOverlay() {
  if (!searchStats || !searchStats.target) return;

  const target = searchStats.target;
  const pTarget = worldToScreen(target.x, target.y);
  const rPixels = dangerRadius * zoom;

  // 1. Shaded Pruned Regions (boxes where |Δ| > dangerRadius)
  searchStats.prunedBoxes.forEach(p => {
    const b = p.box;
    const tl = worldToScreen(b[0], b[3]);
    const br = worldToScreen(b[1], b[2]);
    const w = br.x - tl.x;
    const h = br.y - tl.y;

    if (w > 0 && h > 0) {
      ctx2d.fillStyle = COLORS.prunedRegion;
      ctx2d.fillRect(tl.x, tl.y, w, h);

      ctx2d.strokeStyle = COLORS.prunedBorder;
      ctx2d.lineWidth = 1;
      ctx2d.setLineDash([4, 4]);
      ctx2d.strokeRect(tl.x, tl.y, w, h);
      ctx2d.setLineDash([]);

      // Pruned region label if large enough
      if (w > 70 && h > 30) {
        ctx2d.fillStyle = '#ef4444';
        ctx2d.font = '9px "JetBrains Mono", monospace';
        ctx2d.fillText('PRUNED (Skipped)', tl.x + 8, tl.y + 16);
      }
    }
  });

  // 2. Search Radius Circle around query node
  ctx2d.fillStyle = COLORS.searchRadius;
  ctx2d.beginPath();
  ctx2d.arc(pTarget.x, pTarget.y, rPixels, 0, Math.PI * 2);
  ctx2d.fill();

  ctx2d.strokeStyle = COLORS.searchRadiusBorder;
  ctx2d.lineWidth = 1.5;
  ctx2d.beginPath();
  ctx2d.arc(pTarget.x, pTarget.y, rPixels, 0, Math.PI * 2);
  ctx2d.stroke();

  // 3. Search Traversal Path connecting visited nodes
  if (searchStats.visitedPath.length > 1) {
    ctx2d.strokeStyle = COLORS.visitedLine;
    ctx2d.lineWidth = 1.5;
    ctx2d.setLineDash([2, 2]);
    ctx2d.beginPath();
    for (let i = 0; i < searchStats.visitedPath.length; i++) {
      const sp = worldToScreen(searchStats.visitedPath[i].x, searchStats.visitedPath[i].y);
      if (i === 0) ctx2d.moveTo(sp.x, sp.y);
      else ctx2d.lineTo(sp.x, sp.y);
    }
    ctx2d.stroke();
    ctx2d.setLineDash([]);
  }
}

/**
 * Updates the HUD banner with pruning proof metrics.
 */
function updateInspectorHUD() {
  const infoEl = document.getElementById('viewModeInfo');
  if (!infoEl || !searchStats) return;

  const t = searchStats.target;
  const pctPruned = searchStats.totalNodes > 0
    ? Math.round((searchStats.prunedCount / searchStats.totalNodes) * 100)
    : 0;

  infoEl.innerHTML = `
    <strong>Query Node:</strong> ${t.name} (${t.type.toUpperCase()}) &nbsp;|&nbsp;
    <strong>Radius:</strong> ${dangerRadius} km &nbsp;|&nbsp;
    <strong>Visited:</strong> ${searchStats.visitedCount} &nbsp;|&nbsp;
    <strong>Pruned:</strong> ${searchStats.prunedCount} (${pctPruned}% pruned via K-D Tree)
    <button id="btnClearSelection" class="btn-clean-inline">Clear</button>
  `;

  document.getElementById('btnClearSelection')?.addEventListener('click', () => {
    selectedNodeId = null;
    searchStats = null;
    infoEl.textContent = 'Click any node to inspect K-D Tree search & branch pruning. Drag to pan, scroll to zoom.';
    render2D();
    renderTreeHierarchy();
  });
}

// ── Interactive Hierarchical Binary Tree Graph View ──────────
/**
 * Renders the actual binary tree structure in 2D HTML/SVG.
 */
export function renderTreeHierarchy() {
  if (!hierarchyContainer) return;

  if (!treeRoot) {
    hierarchyContainer.innerHTML = `
      <div class="tree-empty-state">
        <p>Generate satellites to build and inspect the K-D Tree hierarchy.</p>
      </div>`;
    return;
  }

  // Find max depth to render (limit to 4 levels for readability)
  const maxDisplayDepth = 3;

  function buildTreeHTML(node, depth, branchLabel = '') {
    if (!node || depth > maxDisplayDepth) return '';

    const isRisk = riskPairsList.some(p => p.sat1_id === node.point.id || p.sat2_id === node.point.id);
    const isSelected = selectedNodeId === node.point.id;

    const typeBadge = node.point.type === 'active' ? 'SAT' :
                      node.point.type === 'debris' ? 'DEB' : 'RKT';
    const typeClass = node.point.type;

    const cardClass = `tree-node-card ${typeClass} ${isRisk ? 'risk' : ''} ${isSelected ? 'selected' : ''}`;

    let html = `
      <div class="tree-branch-group">
        ${branchLabel ? `<div class="tree-branch-tag">${branchLabel}</div>` : ''}
        <div class="${cardClass}" data-node-id="${node.point.id}">
          <div class="node-card-header">
            <span class="type-tag ${typeClass}">[${typeBadge}]</span>
            <span class="node-name">${node.point.name}</span>
          </div>
          <div class="node-split-rule">
            Split ${node.axis.toUpperCase()}: ${Math.round(node.point[node.axis])} km
          </div>
        </div>
    `;

    if (depth < maxDisplayDepth && (node.left || node.right)) {
      html += `<div class="tree-children">`;
      if (node.left) {
        html += buildTreeHTML(node.left, depth + 1, `< ${Math.round(node.point[node.axis])}`);
      } else {
        html += `<div class="tree-null-node">null</div>`;
      }
      if (node.right) {
        html += buildTreeHTML(node.right, depth + 1, `≥ ${Math.round(node.point[node.axis])}`);
      } else {
        html += `<div class="tree-null-node">null</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  hierarchyContainer.innerHTML = `
    <div class="tree-hierarchy-wrapper">
      <div class="tree-hierarchy-header">
        <h4>K-D Tree Binary Hierarchy (Depth 0 to ${maxDisplayDepth})</h4>
        <span class="tree-legend">
          <span class="tag-box active">[SAT] Satellite</span>
          <span class="tag-box debris">[DEB] Debris</span>
          <span class="tag-box rocket">[RKT] Rocket Body</span>
          <span class="tag-box risk">[RISK] Collision Threat</span>
        </span>
      </div>
      <div class="tree-svg-canvas">
        ${buildTreeHTML(treeRoot, 0, 'ROOT')}
      </div>
    </div>
  `;

  // Attach click listener on tree node cards to focus in 2D map
  hierarchyContainer.querySelectorAll('.tree-node-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = parseInt(card.getAttribute('data-node-id'));
      if (!isNaN(id)) {
        focus2DNode(id);
      }
    });
  });
}

// ── Event Handlers ───────────────────────────────────────────
function onMouseDown(e) {
  if (e.button !== 0) return; // Left click only
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
}

function onMouseMove(e) {
  const rect = canvas2d.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isDragging) {
    panX += e.clientX - dragStartX;
    panY += e.clientY - dragStartY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    render2D();
    return;
  }

  // Hover detection
  const world = screenToWorld(mouseX, mouseY);
  const hitRadiusKm = (15 / zoom);

  let closest = null;
  let minDist = Infinity;

  satellitesList.forEach(sat => {
    const dx = sat.x - world.x;
    const dy = sat.y - world.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < hitRadiusKm && dist < minDist) {
      minDist = dist;
      closest = sat;
    }
  });

  hoveredNode = closest;

  if (hoveredNode && tooltip2d) {
    const isRisk = riskPairsList.some(p => p.sat1_id === hoveredNode.id || p.sat2_id === hoveredNode.id);
    const typeLabel = hoveredNode.type.toUpperCase();

    tooltip2d.innerHTML = `
      <div style="font-weight:700; color:${hoveredNode.type === 'active' ? '#3b82f6' : (hoveredNode.type === 'debris' ? '#94a3b8' : '#f59e0b')}">
        ${hoveredNode.name} [${typeLabel}]
      </div>
      <div>X: ${Math.round(hoveredNode.x)} km</div>
      <div>Y: ${Math.round(hoveredNode.y)} km</div>
      <div>Z: ${Math.round(hoveredNode.z)} km</div>
      <div style="color:${isRisk ? '#ef4444' : '#10b981'}; font-weight:600; margin-top:2px;">
        ${isRisk ? 'COLLISION RISK DETECTED' : 'CLEAR'}
      </div>
      <div style="color:#64748b; font-size:0.68rem; margin-top:3px;">Click to view K-D search & pruning</div>
    `;
    tooltip2d.style.display = 'block';
    tooltip2d.style.left = `${e.clientX + 14}px`;
    tooltip2d.style.top = `${e.clientY - 10}px`;
  } else if (tooltip2d) {
    tooltip2d.style.display = 'none';
  }
}

function onMouseUp() {
  isDragging = false;
}

function onWheel(e) {
  e.preventDefault();
  const rect = canvas2d.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldBefore = screenToWorld(mouseX, mouseY);

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  zoom = Math.max(0.005, Math.min(2.0, zoom * zoomFactor));

  // Keep mouse position stable in world coordinates
  panX = mouseX - worldBefore.x * zoom;
  panY = mouseY + worldBefore.y * zoom;

  render2D();
}

function onClick(e) {
  if (hoveredNode) {
    focus2DNode(hoveredNode.id);
  }
}
