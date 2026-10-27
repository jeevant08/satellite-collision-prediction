# AegisOrbit — Satellite Collision Prediction System

[![DSA Evaluation](https://img.shields.io/badge/DSA-Lab%20Evaluation%203-blue.svg)](https://github.com/jeevant08/satellite-collision-prediction)
[![Tech Stack](https://img.shields.io/badge/Stack-Python%20%7C%20Flask%20%7C%20Three.js%20%7C%20Chart.js-00f2fe.svg)](https://github.com/jeevant08/satellite-collision-prediction)

A real-time **Space Situational Awareness (SSA)** system that predicts and prioritizes orbital satellite collisions. Built for **DSA Lab Evaluation 3 (10 Marks)** using a **3D K-D Tree** for spatial nearest-neighbor search and an **Array-backed Max-Heap Priority Queue** for inverse-distance risk ranking.

---

## 👥 Team Member Roles & File Ownership

To maximize marks under **Rubric (e) Individual Contribution & GitHub Proof**, each member must clone the repository, work on their assigned branch, and make commits using their own GitHub account.

| Member | Focus Area | Assigned Files | Git Commit Prefix |
| :--- | :--- | :--- | :--- |
| **Member 1** | **DSA Core & Geometry** | `python/satellite.py`<br>`python/kdtree.py`<br>`python/heap.py` | `[Member1] feat: ...` |
| **Member 2** | **3D Space Visualization** | `static/js/visualizer3d.js`<br>`static/js/treeVisualizer.js` | `[Member2] feat: ...` |
| **Member 3** | **Complexity & Analytics** | `python/bruteforce.py`<br>`python/analytics.py` | `[Member3] feat: ...` |
| **Member 4** | **UI/UX & Integration** | `templates/index.html`<br>`static/css/styles.css`<br>`static/js/dashboard.js`<br>`static/js/main.js`<br>`app.py` | `[Member4] feat: ...` |

---

## 📊 Rubric Breakdown (10 Marks Total)

| Component | Marks | Responsible | Key Deliverable & Faculty Defense |
| :--- | :---: | :--- | :--- |
| **(a) Data Structure Justification** | 2 | **Member 1** | Explain why 3D K-D Tree ($O(\log N)$) vs Flat Array ($O(N^2)$) or Hash Map. |
| **(b) Implementation Strategy** | 2 | **Member 1** | Balanced median split; Array Max-Heap for $O(\log N)$ extraction vs $O(N \log N)$ sorting. |
| **(c) Live Demo & Edge Cases** | 2 | **ALL** | Handle $N=0$, $N=1$, $\text{radius}=0$, dense clusters without crashing. |
| **(d) Time Complexity Analysis** | 2 | **Member 3** | Benchmark curve: $O(N^2)$ parabola vs $O(N \log N)$ near-linear scaling proof. |
| **(e) GitHub Contribution** | 2 | **ALL** | Verifiable commit history and PR graph from 4 distinct accounts. |

---

## 🛠️ Git Contribution Workflow

Every member should execute these steps in their terminal:

```bash
# 1. Clone the repository
git clone https://github.com/jeevant08/satellite-collision-prediction.git
cd satellite-collision-prediction

# 2. Configure your individual git identity
git config user.name "Your Name"
git config user.email "your_email@example.com"

# 3. Create and switch to your feature branch
# For Member 1:
git checkout -b member1/kdtree-heap

# For Member 2:
git checkout -b member2/threejs-visualization

# For Member 3:
git checkout -b member3/bruteforce-analytics

# For Member 4:
git checkout -b member4/ui-dashboard-integration

# 4. Edit your assigned files and commit with your tag
git add <your_assigned_files>
git commit -m "[MemberX] feat: describe what you implemented"

# 5. Push your branch to GitHub
git push -u origin <your_branch_name>

# 6. Open a Pull Request on GitHub to merge into main!
```

---

## 🚀 Running the Application

### Prerequisites
- Python 3.8+ installed.

### Setup & Launch
```bash
# Install dependencies
pip install -r requirements.txt

# Start the Flask development server
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

---

## 🛡️ Edge Cases Handled
1. **$N = 0$ Satellites**: UI displays empty space with alert banner.
2. **$N = 1$ Satellite**: No pairs possible; reports "No collision risks possible."
3. **Danger Radius = 0 km**: 0 risks detected; prevents division-by-zero in priority calculation.
4. **Large Datasets ($N \ge 2500$)**: K-D Tree spatial pruning prevents browser lockups.
