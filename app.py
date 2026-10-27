# =============================================================
#  app.py — Member 4's File
#  TASK: Flask Application & API routing for collision system
# =============================================================
#
#  RUBRIC COVERAGE:
#    (c) Live Demo        — Orchestrates backend algorithms with frontend UI
#    (e) GitHub Proof     — Member 4 repository integration & wiring
#
#  FACULTY QUESTIONS TO PREPARE:
#    Q: How does the application connect the frontend and backend?
#    A: Flask provides REST API endpoints (/api/simulate, /api/tree,
#       /api/benchmark). The frontend fetches JSON data asynchronously
#       to drive Three.js and Chart.js without reloading the page.
#
#    Q: Why use a backend API instead of pure client-side JavaScript?
#    A: Keeps DSA implementation clean in pure Python, decouples
#       computational logic from presentation, and allows profiling
#       native algorithm execution times accurately.
#
#    Q: What is the /api/stats endpoint for?
#    A: Provides live BF-vs-KD comparison numbers (exact formulas)
#       without running a full benchmark. Used by the right-panel
#       comparison counters in the dashboard.
#
#  HOW TO CONTRIBUTE:
#    git add app.py
#    git commit -m "[Member4] feat: implement Flask API routes and server bootstrap"
# =============================================================

import os
import sys
import math
from flask import Flask, render_template, request, jsonify

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))

from satellite import generate_satellites, satellite_to_dict, euclidean_3d
from kdtree import build_kd_tree, radius_search, tree_to_dict
from heap import MaxHeap
from bruteforce import brute_force_collision_check, count_comparisons
from analytics import run_benchmark, run_full_benchmark_suite, get_complexity_table, get_live_stats

app = Flask(__name__, template_folder='templates', static_folder='static')

# Global cache of currently active satellites and tree
ACTIVE_SATELLITES = []
CURRENT_TREE = None


# ── Route: Serve Dashboard ────────────────────────────────────
@app.route('/')
def index():
    """Serves the main 3-panel dashboard."""
    return render_template('index.html')


# ── Route: Generate Satellites ────────────────────────────────
@app.route('/api/satellites', methods=['POST'])
def api_generate_satellites():
    """
    Generates N satellites and stores them in the global cache.
    Also builds the K-D Tree for subsequent queries.

    Payload: { "count": int }
    Returns: { "satellites": [...], "count": int }
    """
    global ACTIVE_SATELLITES, CURRENT_TREE
    data = request.get_json() or {}
    count = int(data.get('count', 100))

    if count < 0:
        return jsonify({"error": "Satellite count cannot be negative"}), 400

    ACTIVE_SATELLITES = generate_satellites(count) if count > 0 else []
    CURRENT_TREE = build_kd_tree(ACTIVE_SATELLITES) if ACTIVE_SATELLITES else None

    return jsonify({
        "satellites": [satellite_to_dict(s) for s in ACTIVE_SATELLITES],
        "count": len(ACTIVE_SATELLITES)
    })


# ── Route: Run Collision Simulation ───────────────────────────
@app.route('/api/simulate', methods=['POST'])
def api_simulate():
    """
    Executes collision detection via K-D Tree & ranks risks via MaxHeap.

    Pipeline:
        1. For each satellite run radius_search(CURRENT_TREE, sat, radius)
        2. Deduplicate found pairs using a set of frozensets
        3. Insert each unique pair into MaxHeap (priority = 1/distance)
        4. Extract top 10 from MaxHeap (most dangerous first)

    Payload: { "radius": float }
    Returns: { "risk_pairs": [...], "top_risks": [...], "total_risks": int }
    """
    global ACTIVE_SATELLITES, CURRENT_TREE
    data = request.get_json() or {}
    radius = float(data.get('radius', 500.0))

    if radius < 0:
        return jsonify({"error": "Radius cannot be negative"}), 400

    if not ACTIVE_SATELLITES:
        return jsonify({
            "risk_pairs": [],
            "top_risks":  [],
            "total_risks": 0,
            "message": "No satellites available. Generate satellites first."
        })

    if len(ACTIVE_SATELLITES) == 1:
        return jsonify({
            "risk_pairs": [],
            "top_risks":  [],
            "total_risks": 0,
            "message": "Single satellite. No collision pairs possible."
        })

    if not CURRENT_TREE:
        CURRENT_TREE = build_kd_tree(ACTIVE_SATELLITES)

    seen_pairs = set()
    heap       = MaxHeap()
    risk_pairs = []

    # STEP 3: K-D Tree radius search for each satellite → O(N log N) total
    for sat in ACTIVE_SATELLITES:
        neighbors = radius_search(CURRENT_TREE, sat, radius)
        for neighbor in neighbors:
            pair_key = tuple(sorted([sat.id, neighbor.id]))
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                dist = euclidean_3d(sat, neighbor)
                pair_item = {
                    'sat1':     sat,
                    'sat2':     neighbor,
                    'distance': dist
                }
                # STEP 4: Insert into MaxHeap → O(log N)
                heap.insert(pair_item)
                risk_pairs.append({
                    'sat1_id':   sat.id,
                    'sat1_name': sat.name,
                    'sat2_id':   neighbor.id,
                    'sat2_name': neighbor.name,
                    'distance':  round(dist, 2)
                })

    # STEP 5: Extract top 10 from MaxHeap → O(10 * log N)
    top_10 = []
    top_items = heap.extract_all() if heap.size > 0 else []
    for item in top_items[:10]:
        top_10.append({
            'sat1_id':   item['sat1'].id,
            'sat1_name': item['sat1'].name,
            'sat2_id':   item['sat2'].id,
            'sat2_name': item['sat2'].name,
            'distance':  round(item['distance'], 2)
        })

    return jsonify({
        "risk_pairs":  risk_pairs,
        "top_risks":   top_10,
        "total_risks": len(risk_pairs),
        "message":     "Collision detection completed successfully."
    })


# ── Route: Get K-D Tree ───────────────────────────────────────
@app.route('/api/tree', methods=['GET'])
def api_get_tree():
    """Returns serialised K-D Tree for split-plane visualization (Member 2)."""
    global CURRENT_TREE
    if not CURRENT_TREE:
        return jsonify({"tree": None, "message": "No tree built yet."})
    return jsonify({"tree": tree_to_dict(CURRENT_TREE)})


# ── Route: Run Benchmark Suite ────────────────────────────────
@app.route('/api/benchmark', methods=['POST'])
def api_benchmark():
    """
    Runs benchmark suite comparing Brute Force O(N²) vs K-D Tree O(N log N).
    Implemented by Member 3 (analytics.py). Returns data for Chart.js graph.

    Payload: { "radius": float }
    Returns: { "results": [...], "complexity_table": [...] }
    """
    data = request.get_json() or {}
    radius = float(data.get('radius', 500.0))

    try:
        results = run_full_benchmark_suite(radius)
        complexity_table = get_complexity_table()
        return jsonify({
            "results":          results,
            "complexity_table": complexity_table
        })
    except NotImplementedError as e:
        return jsonify({"error": str(e)}), 501
    except Exception as e:
        return jsonify({"error": f"Benchmark failed: {str(e)}"}), 500


# ── Route: Live Complexity Stats ──────────────────────────────
@app.route('/api/stats', methods=['GET'])
def api_stats():
    """
    Returns live comparison stats for the current satellite count.
    No benchmark run needed — purely mathematical formulas.

    Query params: ?n=<int>&kd_comps=<int>
    Returns: { "bf_comparisons": int, "kd_comparisons": int, ... }
    """
    n = int(request.args.get('n', len(ACTIVE_SATELLITES)))
    kd_comps = int(request.args.get('kd_comps', max(1, round(n * math.log2(n))) if n > 1 else 0))

    try:
        stats = get_live_stats(n, kd_comps)
        return jsonify(stats)
    except NotImplementedError as e:
        # Provide fallback stats if Member 3 hasn't implemented yet
        bf = n * (n - 1) // 2 if n > 1 else 0
        kd = kd_comps
        return jsonify({
            "bf_comparisons": bf,
            "kd_comparisons": kd,
            "comps_saved":    max(0, bf - kd),
            "speedup_label":  f"{round(bf / kd)}x faster" if kd > 0 else "N/A",
            "bf_formula":     f"N*(N-1)/2 = {bf:,}",
            "kd_formula":     f"≈ N·log₂(N) = {kd:,}"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Entry Point ───────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 60)
    print("  AegisOrbit — Satellite Collision Prediction System")
    print("  Flask server starting on http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, port=5000)
