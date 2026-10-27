#  Satellite Collision Prediction System


A real-time **Space Situational Awareness (SSA)** system that predicts and prioritizes orbital satellite collisions. Built using a **3D K-D Tree** for spatial nearest-neighbor search and an **Array-backed Max-Heap Priority Queue** for inverse-distance risk ranking.

---

##  Team Member Roles & File Ownership


| Member | Focus Area | Assigned Files | Git Commit Prefix |
| :--- | :--- | :--- | :--- |
| **Member 1** | **DSA Core & Geometry** | `python/satellite.py`<br>`python/kdtree.py`<br>`python/heap.py` | `[Member1] feat: ...` |
| **Member 2** | **3D Space Visualization** | `static/js/visualizer3d.js`<br>`static/js/treeVisualizer.js` | `[Member2] feat: ...` |
| **Member 3** | **Complexity & Analytics** | `python/bruteforce.py`<br>`python/analytics.py` | `[Member3] feat: ...` |
| **Member 4** | **UI/UX & Integration** | `templates/index.html`<br>`static/css/styles.css`<br>`static/js/dashboard.js`<br>`static/js/main.js`<br>`app.py` | `[Member4] feat: ...` |


---

##  Edge Cases Handled
1. **$N = 0$ Satellites**: UI displays empty space with alert banner.
2. **$N = 1$ Satellite**: No pairs possible; reports "No collision risks possible."
3. **Danger Radius = 0 km**: 0 risks detected; prevents division-by-zero in priority calculation.
4. **Large Datasets ($N \ge 2500$)**: K-D Tree spatial pruning prevents browser lockups.
