// =============================================================
//  visualizer3d.js — Member 2's File
//  TASK: Three.js 3D Orbital Scene & Spatial Entity Rendering
// =============================================================
//
//  RUBRIC COVERAGE:
//    (c) Live Demo — Provides visually compelling 3D spatial simulation
//
//  FACULTY QUESTIONS TO PREPARE:
//    Q: How are coordinates mapped into the 3D scene?
//    A: Space coordinates (±10,000 km) are normalized to Three.js world units
//       so that satellites, bounding boundaries, and danger radii scale accurately.
//
//    Q: How does real-time orbit animation interact with K-D Tree?
//    A: At each animation frame or time tick dt, position += velocity * dt.
//       When satellites move, spatial proximity changes, requiring K-D Tree queries.
//
//    Q: How does the tooltip raycasting system work?
//    A: On each mouse move event, a Raycaster is cast from the camera through
//       the mouse position. If it intersects a satellite mesh, we display a
//       floating HTML overlay showing name, ID, type, and 3D coordinates.
//       This is O(N) per frame but only triggers on mousemove, not every frame.
//
//    Q: What is the bounding wireframe box?
//    A: A wireframe cube of ±10,000 km on each axis that shows the spatial
//       boundary of the simulation universe. Helps spatially orient the viewer
//       and provides visual context for K-D Tree partitioning planes.
//
//    Q: How do orbit trail lines work?
//    A: Each satellite mesh stores a circular buffer (ring buffer) of its last
//       MAX_TRAIL_LENGTH positions. On each animation tick we push the current
//       position and rebuild a THREE.Line from the buffer. This gives a fading
//       motion trail that shows orbital trajectory. Uses a circular array to
//       keep memory O(N * MAX_TRAIL_LENGTH) bounded.
//
//  HOW TO CONTRIBUTE:
//    git add static/js/visualizer3d.js
//    git commit -m "[Member2] feat: init Three.js scene with OrbitControls and starfield"
//    git commit -m "[Member2] feat: add satellite sphere rendering and collision highlight"
//    git commit -m "[Member2] feat: add raycasting tooltip, orbit trails, and bounding box"
// =============================================================

let scene, camera, renderer, controls;
let satelliteMeshGroup = null;
let collisionLinesGroup = null;
let orbitTrailsGroup = null;
let boundingBoxMesh = null;
let dangerRadiusSpheres = [];
let satellitesData = [];
let isAnimating = true;

// ── Raycasting / Tooltip state ──────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let tooltipEl = null;

// ── Orbit Trail Config ──────────────────────────────────────
const MAX_TRAIL_LENGTH = 60;   // max trail points per satellite
const TRAIL_UPDATE_INTERVAL = 3; // push a trail point every N frames
let frameCounter = 0;

/**
 * Initializes the Three.js 3D scene, camera, lighting, and OrbitControls.
 * @param {string} containerId - The DOM element ID to attach WebGL canvas to.
 */
export function initScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e17);

  // 2. Camera
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 1, 50000);
  camera.position.set(0, 3000, 7500);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 4. OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 25000;
  controls.minDistance = 500;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5000, 10000, 7500);
  scene.add(dirLight);

  // 6. Starfield particle background
  createStarfield();

  // 7. Groups
  satelliteMeshGroup = new THREE.Group();
  collisionLinesGroup = new THREE.Group();
  orbitTrailsGroup = new THREE.Group();
  scene.add(satelliteMeshGroup);
  scene.add(collisionLinesGroup);
  scene.add(orbitTrailsGroup);

  // 8. Bounding wireframe box (±10,000 km universe boundary)
  createBoundingBox();

  // 9. Create tooltip overlay element
  createTooltipElement(container);

  // 10. Mouse move listener for raycasting tooltips
  renderer.domElement.addEventListener('mousemove', onMouseMove, false);

  // Window resize handler
  window.addEventListener('resize', () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    frameCounter++;

    if (isAnimating && satellitesData.length > 0) {
      // Orbit propagation
      animateOrbits(0.016);

      // Update orbit trails every few frames
      if (frameCounter % TRAIL_UPDATE_INTERVAL === 0) {
        updateOrbitTrails();
      }
    }

    renderer.render(scene, camera);
  }
  animate();
}

/**
 * Creates an immersive cosmic starfield in the background.
 * Uses a BufferGeometry with randomized 3D positions for 3500 star particles
 * spread across a 40,000-unit cube, giving depth to the space environment.
 */
function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 3500;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 40000;
    starPositions[i + 1] = (Math.random() - 0.5) * 40000;
    starPositions[i + 2] = (Math.random() - 0.5) * 40000;
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMaterial = new THREE.PointsMaterial({ color: 0x88aaff, size: 2.5, transparent: true, opacity: 0.8 });
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}

/**
 * Creates a wireframe bounding box showing the ±10,000 km universe boundary.
 * This provides spatial context for the K-D Tree partitioning planes and helps
 * the viewer understand the spatial scale of the simulation.
 */
function createBoundingBox() {
  const boxGeo = new THREE.BoxGeometry(20000, 20000, 20000);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x1e3a5f,
    transparent: true,
    opacity: 0.35
  });
  boundingBoxMesh = new THREE.LineSegments(edges, lineMat);
  scene.add(boundingBoxMesh);
}

/**
 * Creates the floating HTML tooltip element for satellite info on hover.
 * Positioned absolutely within the 3D viewport container.
 * @param {HTMLElement} container - The parent container for the tooltip.
 */
function createTooltipElement(container) {
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'satelliteTooltip';
  tooltipEl.style.cssText = `
    position: absolute;
    pointer-events: none;
    background: #111827;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: #f1f5f9;
    display: none;
    z-index: 100;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    line-height: 1.5;
  `;
  container.style.position = 'relative';
  container.appendChild(tooltipEl);
}

/**
 * Handles mouse movement over the 3D viewport for raycasting-based tooltips.
 * Casts a ray from the camera through the mouse position and checks intersection
 * with satellite meshes. Displays satellite info (name, type, coordinates) on hover.
 *
 * Raycasting complexity: O(N) where N is the number of satellite meshes.
 * Only triggered on mousemove events, not every animation frame.
 *
 * @param {MouseEvent} event - The mouse move event
 */
function onMouseMove(event) {
  if (!tooltipEl || !satelliteMeshGroup || satelliteMeshGroup.children.length === 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(satelliteMeshGroup.children);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const sat = mesh.userData.satData;
    if (sat) {
      const typeColor = sat.type === 'active' ? '#3b82f6' :
                        sat.type === 'debris' ? '#94a3b8' : '#f59e0b';
      const typeLabel = sat.type.toUpperCase();

      tooltipEl.innerHTML = `
        <div style="color: ${typeColor}; font-weight: 700; margin-bottom: 2px;">
          ${sat.name} <span style="opacity:0.6">[ID: ${sat.id}]</span>
        </div>
        <div>Type: <span style="color: ${typeColor}">${typeLabel}</span></div>
        <div>X: ${Math.round(sat.x)} km</div>
        <div>Y: ${Math.round(sat.y)} km</div>
        <div>Z: ${Math.round(sat.z)} km</div>
        <div style="color: #64748b; margin-top: 2px;">
          V: (${sat.vx.toFixed(1)}, ${sat.vy.toFixed(1)}, ${sat.vz.toFixed(1)}) km/s
        </div>
      `;
      tooltipEl.style.display = 'block';
      tooltipEl.style.left = (event.clientX - renderer.domElement.getBoundingClientRect().left + 16) + 'px';
      tooltipEl.style.top = (event.clientY - renderer.domElement.getBoundingClientRect().top - 10) + 'px';
    }
  } else {
    tooltipEl.style.display = 'none';
  }
}

/**
 * Renders satellites as 3D sphere meshes categorized by type.
 * Each satellite type has a distinct material and size:
 *   - Active satellites: Blue, medium size (radius 45)
 *   - Debris: Grey, small size (radius 28) — represents dead fragments
 *   - Rocket bodies: Amber, large size (radius 55) — represents spent stages
 *
 * Also initializes orbit trail buffers for each satellite.
 *
 * @param {Array} satellites - List of satellite dicts {id, name, x, y, z, vx, vy, vz, type}
 */
export function renderSatellites(satellites) {
  satellitesData = satellites || [];
  if (!satelliteMeshGroup) return;

  // Clear previous meshes
  while (satelliteMeshGroup.children.length > 0) {
    satelliteMeshGroup.remove(satelliteMeshGroup.children[0]);
  }

  // Clear previous orbit trails
  clearOrbitTrails();

  // Clear danger radius spheres
  clearDangerRadiusSpheres();

  // Materials based on type
  const activeMaterial = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4, metalness: 0.4 });
  const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7, metalness: 0.2 });
  const rocketMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.3 });

  satellites.forEach(sat => {
    let mat = activeMaterial;
    let radius = 45;

    if (sat.type === 'debris') {
      mat = debrisMaterial;
      radius = 28;
    } else if (sat.type === 'rocket') {
      mat = rocketMaterial;
      radius = 55;
    }

    const geo = new THREE.SphereGeometry(radius, 12, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sat.x, sat.y, sat.z);
    mesh.userData = {
      id: sat.id,
      name: sat.name,
      satData: sat,
      trailPositions: []   // circular buffer for orbit trail
    };
    satelliteMeshGroup.add(mesh);
  });
}

/**
 * Highlights at-risk satellites and draws connecting threat vectors.
 * Risk pairs are drawn as red lines between satellite positions,
 * and at-risk satellites are re-colored glowing red with a 1.4x scale increase.
 *
 * @param {Array} riskPairs - List of risk pairs {sat1_id, sat2_id, distance}
 */
export function highlightRisks(riskPairs) {
  if (!collisionLinesGroup) return;

  // Clear previous lines
  while (collisionLinesGroup.children.length > 0) {
    collisionLinesGroup.remove(collisionLinesGroup.children[0]);
  }

  if (!riskPairs || riskPairs.length === 0) return;

  const riskIds = new Set();
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2, transparent: true, opacity: 0.85 });

  // Map of satellite id to object mesh
  const meshMap = new Map();
  satelliteMeshGroup.children.forEach(mesh => {
    meshMap.set(mesh.userData.id, mesh);
  });

  riskPairs.forEach(pair => {
    riskIds.add(pair.sat1_id);
    riskIds.add(pair.sat2_id);

    const mesh1 = meshMap.get(pair.sat1_id);
    const mesh2 = meshMap.get(pair.sat2_id);

    if (mesh1 && mesh2) {
      const points = [mesh1.position, mesh2.position];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMaterial);
      collisionLinesGroup.add(line);
    }
  });

  // Highlight at-risk satellites in clean red
  const threatMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  satelliteMeshGroup.children.forEach(mesh => {
    if (riskIds.has(mesh.userData.id)) {
      mesh.material = threatMaterial;
      mesh.scale.set(1.4, 1.4, 1.4);
    }
  });
}

/**
 * Visualizes the danger radius as a transparent red sphere around each at-risk satellite.
 * Provides a visual representation of the collision proximity threshold.
 *
 * @param {Array} riskPairs - List of risk pairs with sat1_id and sat2_id
 * @param {number} radius - The danger radius in km
 */
export function showDangerRadiusSpheres(riskPairs, radius) {
  clearDangerRadiusSpheres();
  if (!riskPairs || riskPairs.length === 0 || !radius || radius <= 0) return;

  const riskIds = new Set();
  riskPairs.forEach(pair => {
    riskIds.add(pair.sat1_id);
    riskIds.add(pair.sat2_id);
  });

  const dangerMat = new THREE.MeshBasicMaterial({
    color: 0xff4757,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  satelliteMeshGroup.children.forEach(mesh => {
    if (riskIds.has(mesh.userData.id)) {
      const sphereGeo = new THREE.SphereGeometry(radius, 16, 16);
      const sphere = new THREE.Mesh(sphereGeo, dangerMat);
      sphere.position.copy(mesh.position);
      scene.add(sphere);
      dangerRadiusSpheres.push(sphere);
    }
  });
}

/**
 * Removes all danger radius sphere visualizations from the scene.
 */
function clearDangerRadiusSpheres() {
  dangerRadiusSpheres.forEach(sphere => {
    scene.remove(sphere);
  });
  dangerRadiusSpheres = [];
}

/**
 * Propagates orbits forward in time using velocity vectors.
 * Uses Euler integration: new_position = old_position + velocity * dt * visual_scale.
 * The visual scaling factor (25x) speeds up movement for presentation purposes.
 *
 * @param {number} dt - Time step in seconds.
 */
export function animateOrbits(dt) {
  if (!satelliteMeshGroup) return;

  satelliteMeshGroup.children.forEach(mesh => {
    const s = mesh.userData.satData;
    if (s && s.vx !== undefined) {
      s.x += s.vx * dt * 25; // Visual scaling factor
      s.y += s.vy * dt * 25;
      s.z += s.vz * dt * 25;
      mesh.position.set(s.x, s.y, s.z);
    }
  });
}

/**
 * Records current positions into orbit trail buffers for each satellite.
 * Uses a bounded array (circular buffer pattern) to limit memory usage.
 * Each satellite stores at most MAX_TRAIL_LENGTH positions.
 *
 * Data structure: Array-based circular buffer — O(1) push, O(N) rebuild for rendering.
 * Total space: O(numSatellites * MAX_TRAIL_LENGTH) = bounded.
 */
function updateOrbitTrails() {
  if (!satelliteMeshGroup || !orbitTrailsGroup) return;

  // Clear old trail lines
  while (orbitTrailsGroup.children.length > 0) {
    orbitTrailsGroup.remove(orbitTrailsGroup.children[0]);
  }

  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0x4f8ef7,
    transparent: true,
    opacity: 0.25
  });

  satelliteMeshGroup.children.forEach(mesh => {
    const trail = mesh.userData.trailPositions;
    if (!trail) return;

    // Push current position to trail buffer
    trail.push(new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z));

    // Keep buffer bounded (circular buffer eviction)
    if (trail.length > MAX_TRAIL_LENGTH) {
      trail.shift();
    }

    // Only draw trail if we have at least 2 points
    if (trail.length >= 2) {
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trail);
      const trailLine = new THREE.Line(trailGeo, trailMaterial);
      orbitTrailsGroup.add(trailLine);
    }
  });
}

/**
 * Clears all orbit trail lines and resets trail buffers.
 */
function clearOrbitTrails() {
  if (!orbitTrailsGroup) return;
  while (orbitTrailsGroup.children.length > 0) {
    orbitTrailsGroup.remove(orbitTrailsGroup.children[0]);
  }
  // Reset trail buffers on each satellite mesh
  if (satelliteMeshGroup) {
    satelliteMeshGroup.children.forEach(mesh => {
      if (mesh.userData) {
        mesh.userData.trailPositions = [];
      }
    });
  }
}

/**
 * Toggles the orbit animation on or off.
 * When paused, satellites freeze in place and trails stop updating.
 *
 * @returns {boolean} The new animation state (true = animating, false = paused)
 */
export function toggleAnimation() {
  isAnimating = !isAnimating;
  return isAnimating;
}

/**
 * Returns the current animation state.
 * @returns {boolean} True if animation is running.
 */
export function getAnimationState() {
  return isAnimating;
}

/**
 * Returns the Three.js scene object.
 * Used by treeVisualizer.js to add K-D Tree split planes into the same scene.
 *
 * @returns {THREE.Scene} The active Three.js scene
 */
export function getScene() {
  return scene;
}

/**
 * Returns the camera object for external use (e.g., focusing on a satellite).
 * @returns {THREE.PerspectiveCamera} The active camera
 */
export function getCamera() {
  return camera;
}

/**
 * Focuses the camera on a specific satellite by its ID.
 * Smoothly animates the OrbitControls target to the satellite's position.
 *
 * @param {number} satId - The satellite ID to focus on
 */
export function focusOnSatellite(satId) {
  if (!satelliteMeshGroup || !controls) return;

  const targetMesh = satelliteMeshGroup.children.find(m => m.userData.id === satId);
  if (targetMesh) {
    controls.target.copy(targetMesh.position);
    controls.update();
  }
}
