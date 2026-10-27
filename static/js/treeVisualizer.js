// =============================================================
//  treeVisualizer.js — Member 2's File
//  TASK: 3D K-D Tree Spatial Split-Plane Visualizer
// =============================================================
//
//  RUBRIC COVERAGE:
//    (a) Data Structure Justification — Visual proof of spatial bounding
//    (c) Live Demo                   — Interactive step-through of K-D partitions
//
//  FACULTY QUESTIONS TO PREPARE:
//    Q: How do the colored planes represent K-D Tree splits?
//    A: Each plane corresponds to a node in the tree:
//       - Red   = X-axis split (depth % 3 == 0)
//       - Green = Y-axis split (depth % 3 == 1)
//       - Blue  = Z-axis split (depth % 3 == 2)
//       As depth increases, space is partitioned into progressively smaller boxes.
//
//    Q: How does this prove branch pruning during search?
//    A: If the distance from query point to the splitting plane > radius,
//       the entire half-space beyond that plane can be safely ignored.
//
//  HOW TO CONTRIBUTE:
//    git add static/js/treeVisualizer.js
//    git commit -m "[Member2] feat: implement K-D Tree 3D split planes visualizer"
//    git commit -m "[Member2] feat: add level-by-level step through for faculty demo"
// =============================================================

import { getScene } from './visualizer3d.js';

let planesGroup = null;
const BOUND = 10000;

// Color mapping: X (Red), Y (Green), Z (Blue)
const AXIS_COLORS = {
  x: 0xff4757, // Red
  y: 0x2ed573, // Green
  z: 0x4f8ef7  // Blue
};

/**
 * Visualizes the 3D bounding split planes up to a specified depth.
 * @param {Object} treeNode - The root KDNode dict {point, axis, left, right}
 * @param {number} maxDepth - Maximum depth to render planes for.
 */
export function showSplittingPlanes(treeNode, maxDepth = 2) {
  const scene = getScene();
  if (!scene) return;

  if (!planesGroup) {
    planesGroup = new THREE.Group();
    scene.add(planesGroup);
  }

  clearPlanes();

  if (!treeNode) return;

  // Recursive traversal to build planes down to maxDepth
  function traverse(node, depth, xRange, yRange, zRange) {
    if (!node || depth > maxDepth) return;

    const { x, y, z } = node.point;
    const axis = node.axis;
    const color = AXIS_COLORS[axis] || 0xffffff;

    // Create a semi-transparent splitting plane mesh
    let planeGeo;
    let planeMesh;
    const planeMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18 - depth * 0.03,
      side: THREE.DoubleSide,
      wireframe: false
    });

    if (axis === 'x') {
      const h = yRange[1] - yRange[0];
      const d = zRange[1] - zRange[0];
      planeGeo = new THREE.PlaneGeometry(d, h);
      planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.rotation.y = Math.PI / 2;
      planeMesh.position.set(x, (yRange[0] + yRange[1]) / 2, (zRange[0] + zRange[1]) / 2);
    } else if (axis === 'y') {
      const w = xRange[1] - xRange[0];
      const d = zRange[1] - zRange[0];
      planeGeo = new THREE.PlaneGeometry(w, d);
      planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.rotation.x = Math.PI / 2;
      planeMesh.position.set((xRange[0] + xRange[1]) / 2, y, (zRange[0] + zRange[1]) / 2);
    } else {
      // z axis
      const w = xRange[1] - xRange[0];
      const h = yRange[1] - yRange[0];
      planeGeo = new THREE.PlaneGeometry(w, h);
      planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.position.set((xRange[0] + xRange[1]) / 2, (yRange[0] + yRange[1]) / 2, z);
    }

    planesGroup.add(planeMesh);

    // Recurse left and right with updated bounding boxes
    if (axis === 'x') {
      traverse(node.left, depth + 1, [xRange[0], x], yRange, zRange);
      traverse(node.right, depth + 1, [x, xRange[1]], yRange, zRange);
    } else if (axis === 'y') {
      traverse(node.left, depth + 1, xRange, [yRange[0], y], zRange);
      traverse(node.right, depth + 1, xRange, [y, yRange[1]], zRange);
    } else {
      traverse(node.left, depth + 1, xRange, yRange, [zRange[0], z]);
      traverse(node.right, depth + 1, xRange, yRange, [z, zRange[1]]);
    }
  }

  traverse(treeNode, 0, [-BOUND, BOUND], [-BOUND, BOUND], [-BOUND, BOUND]);
}

/**
 * Clears all rendered split planes from the 3D scene.
 */
export function clearPlanes() {
  if (!planesGroup) return;
  while (planesGroup.children.length > 0) {
    planesGroup.remove(planesGroup.children[0]);
  }
}
