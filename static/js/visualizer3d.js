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
//  HOW TO CONTRIBUTE:
//    git add static/js/visualizer3d.js
//    git commit -m "[Member2] feat: init Three.js scene with OrbitControls and starfield"
//    git commit -m "[Member2] feat: add satellite sphere rendering and collision highlight"
// =============================================================

let scene, camera, renderer, controls;
let satelliteMeshGroup = null;
let collisionLinesGroup = null;
let satellitesData = [];
let isAnimating = true;

/**
 * Initializes the Three.js 3D scene, camera, lighting, and OrbitControls.
 * @param {string} containerId - The DOM element ID to attach WebGL canvas to.
 */
export function initScene(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050714);

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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x4f8ef7, 1.2);
  dirLight.position.set(5000, 10000, 7500);
  scene.add(dirLight);

  // 6. Starfield particle background
  createStarfield();

  // 7. Groups
  satelliteMeshGroup = new THREE.Group();
  collisionLinesGroup = new THREE.Group();
  scene.add(satelliteMeshGroup);
  scene.add(collisionLinesGroup);

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

    if (isAnimating && satellitesData.length > 0) {
      // Orbit propagation
      animateOrbits(0.016);
    }

    renderer.render(scene, camera);
  }
  animate();
}

/**
 * Creates an immersive cosmic starfield in the background.
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
 * Renders satellites as 3D sphere meshes categorized by type.
 * @param {Array} satellites - List of satellite dicts {id, name, x, y, z, vx, vy, vz, type}
 */
export function renderSatellites(satellites) {
  satellitesData = satellites || [];
  if (!satelliteMeshGroup) return;

  // Clear previous meshes
  while (satelliteMeshGroup.children.length > 0) {
    satelliteMeshGroup.remove(satelliteMeshGroup.children[0]);
  }

  // Materials based on type
  const activeMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8ef7, roughness: 0.3, metalness: 0.8 });
  const debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8, metalness: 0.2 });
  const rocketMaterial = new THREE.MeshStandardMaterial({ color: 0xffa502, roughness: 0.4, metalness: 0.6 });

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
    mesh.userData = { id: sat.id, name: sat.name, satData: sat };
    satelliteMeshGroup.add(mesh);
  });
}

/**
 * Highlights at-risk satellites and draws connecting threat vectors.
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
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff4757, linewidth: 2, transparent: true, opacity: 0.85 });

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

  // Highlight at-risk satellites in glowing red
  const threatMaterial = new THREE.MeshBasicMaterial({ color: 0xff4757 });
  satelliteMeshGroup.children.forEach(mesh => {
    if (riskIds.has(mesh.userData.id)) {
      mesh.material = threatMaterial;
      mesh.scale.set(1.4, 1.4, 1.4);
    }
  });
}

/**
 * Propagates orbits forward in time using velocity vectors.
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

export function getScene() {
  return scene;
}
