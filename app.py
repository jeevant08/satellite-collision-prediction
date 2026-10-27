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
#  HOW TO CONTRIBUTE:
#    git add app.py
#    git commit -m "[Member4] feat: implement Flask API routes and server bootstrap"
# =============================================================

import os
import sys
from flask import Flask, render_template, request, jsonify

# Add python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python'))

from satellite import generate_satellites, satellite_to_dict
from kdtree import build_kd_tree, radius_search, tree_to_dict
from heap import MaxHeap
from bruteforce import brute_force_collision_check, count_comparisons
from analytics import run_benchmark, run_full_benchmark_suite, get_complexity_table, get_live_stats

app = Flask(__name__, template_folder='templates', static_folder='static')

# Global cache of currently active satellites and tree
ACTIVE_SATELLITES = []
CURRENT_TREE = None

@app.route('/')
def index():
    """Serves the main 3-panel dashboard."""
    return render_template('index.html')

@app.route('/api/satellites', methods=['POST'])
def api_generate_satellites():
    """
    Generates N satellites and stores them in session cache.
    Payload: { "count": int }
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

@app.route('/api/simulate', methods=['POST'])
def api_simulate():
    """
    Executes collision detection via K-D Tree & ranks risks via MaxHeap.
    Payload: { "radius": float }
    """
    global ACTIVE_SATELLITES, CURRENT_TREE
    data = request.get_json() or {}
    radius = float(data.get('radius', 500.0))

    if radius < 0:
        return jsonify({"error": "Radius cannot be negative"}), 400

    if not ACTIVE_SATELLITES:
        return jsonify({
            "risk_pairs": [],
            "top_risks": [],
            "total_risks": 0,
            "message": "No satellites available. Generate satellites first."
        })

    if len(ACTIVE_SATELLITES) == 1:
        return jsonify({
            "risk_pairs": [],
            "top_risks": [],
            "total_risks": 0,
            "message": "Single satellite. No collision pairs possible."
        })

    if not CURRENT_TREE:
        CURRENT_TREE = build_kd_tree(ACTIVE_SATELLITES)

    seen_pairs = set()
    heap = MaxHeap()
    risk_pairs = []

    for sat in ACTIVE_SATELLITES:
        neighbors = radius_search(CURRENT_TREE, sat, radius)
        for neighbor in neighbors:
            pair_key = tuple(sorted([sat.id, neighbor.id]))
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                from satellite import euclidean_3d
                dist = euclidean_3d(sat, neighbor)
                pair_item = {
                    'sat1': sat,
                    'sat2': neighbor,
                    'distance': dist
                }
                heap.insert(pair_item)
                risk_pairs.append({
                    'sat1_id': sat.id,
                    'sat1_name': sat.name,
                    'sat2_id': neighbor.id,
                    'sat2_name': neighbor.name,
                    'distance': round(dist, 2)
                })

    # Extract top 10 from MaxHeap
    top_10 = []
    top_items = heap.extract_all() if heap.size > 0 else []
    for item in top_items[:10]:
        top_10.append({
            'sat1_id': item['sat1'].id,
            'sat1_name': item['sat1'].name,
            'sat2_id': item['sat2'].id,
            'sat2_name': item['sat2'].name,
            'distance': round(item['distance'], 2)
        })

    return jsonify({
        "risk_pairs": risk_pairs,
        "top_risks": top_10,
        "total_risks": len(risk_pairs),
        "message": "Collision detection completed successfully."
    })

@app.route('/api/tree', methods=['GET'])
def api_get_tree():
    """Returns serialised K-D Tree for split-plane visualization."""
    global CURRENT_TREE
    if not CURRENT_TREE:
        return jsonify({"tree": None, "message": "No tree built yet."})
    return jsonify({"tree": tree_to_dict(CURRENT_TREE)})

@app.route('/api/benchmark', methods=['POST'])
def api_benchmark():
    """
    Runs benchmark suite comparing Brute Force O(N^2) vs K-D Tree O(N log N).
    Payload: { "radius": float }
    """
    data = request.get_json() or {}
    radius = float(data.get('radius', 500.0))

    try:
        results = run_full_benchmark_suite(radius)
        complexity_table = get_complexity_table()
        return jsonify({
            "results": results,
            "complexity_table": complexity_table
        })
    except NotImplementedError as e:
        return jsonify({"error": str(e)}), 501

if __name__ == '__main__':
    print("=" * 60)
    print("  Satellite Collision Prediction System - Flask Server")
    print("  Open: http://127.0.0.1:5000 in your browser")
    print("=" * 60)
    app.run(debug=True, port=5000)
