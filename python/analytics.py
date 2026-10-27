# =============================================================
#  analytics.py — Member 3's File
#  TASK: Benchmark both algorithms and produce comparison data
# =============================================================
#
#  RUBRIC COVERAGE:
#    (d) Time Complexity Analysis — THIS file IS your proof.
#        The benchmark data drives the Chart.js graph in the UI.
#    (c) Live Demo               — live stats panel
#
#  FACULTY QUESTIONS TO PREPARE:
#    Q: State exact Big-O of K-D Tree.
#    A: Build O(N log N) | Single query O(log N) avg | Space O(N)
#
#    Q: Prove O(log N) search mathematically.
#    A: Tree height h = ⌊log₂N⌋ (balanced via median split).
#       At each node we test: |target[axis] - node[axis]| > radius?
#       If YES → skip entire subtree (2^(h-level) nodes saved).
#       Result: we visit at most O(log N) nodes per query.
#
#    Q: Why does your chart look like a curve vs flat line?
#    A: Brute force grows as N² — a parabola.
#       K-D Tree grows as N log N — nearly linear. The gap widens fast.
#
#  HOW TO CONTRIBUTE:
#    git add python/analytics.py
#    git commit -m "[Member3] feat: implement benchmark runner"
#    git commit -m "[Member3] feat: add complexity table data"
# =============================================================

import time
import math
import sys
import os

sys.path.append(os.path.dirname(__file__))

from satellite import generate_satellites, euclidean_3d
from kdtree   import build_kd_tree, radius_search
from heap     import MaxHeap
from bruteforce import brute_force_collision_check, count_comparisons

# N values used for the benchmark — sent to Chart.js for the x-axis
BENCHMARK_SIZES = [50, 100, 250, 500, 1000, 2000, 5000]


# ── TODO (Member 3): Implement run_benchmark(n, radius) ──────
def run_benchmark(n: int, radius: float) -> dict:
    """
    Runs BOTH algorithms on the same randomly generated dataset
    and records timing and comparison counts for each.

    STEPS:
        1. Generate n satellites: generate_satellites(n)
        2. Run brute_force_collision_check(sats, radius) → record time & pairs
        3. Build K-D Tree: build_kd_tree(sats)          → record build time
        4. Run radius_search for EACH satellite           → record search time
        5. Insert all risk pairs into MaxHeap
        6. Return the comparison dict below

    Args:
        n      : number of satellites to generate
        radius : collision danger threshold in km

    Returns:
        dict {
            'n'               : int,
            'bf_time_ms'      : float,  ← brute force total time
            'bf_comparisons'  : int,    ← exact N*(N-1)/2
            'kd_build_ms'     : float,  ← time to build the tree
            'kd_search_ms'    : float,  ← time to run all radius searches
            'kd_total_ms'     : float,  ← build + search combined
            'speedup'         : float,  ← bf_time_ms / kd_total_ms
            'risk_pairs'      : list,   ← serialisable pairs from K-D Tree
            'top_risks'       : list    ← top 10 from MaxHeap (most dangerous)
        }
    """
    if n <= 0:
        return {
            'n': 0,
            'bf_time_ms': 0.0,
            'bf_comparisons': 0,
            'kd_build_ms': 0.0,
            'kd_search_ms': 0.0,
            'kd_total_ms': 0.0,
            'speedup': 1.0,
            'risk_pairs': [],
            'top_risks': []
        }

    # Step 1: Generate n satellites
    sats = generate_satellites(n)

    # Step 2: Brute-force baseline
    bf_res = brute_force_collision_check(sats, radius)
    bf_time_ms = bf_res['time_ms']
    bf_comparisons = bf_res['comparisons']

    # Step 3: Build K-D Tree
    t_build_start = time.perf_counter()
    tree = build_kd_tree(sats)
    t_build_end = time.perf_counter()
    kd_build_ms = (t_build_end - t_build_start) * 1000.0

    # Step 4 & 5: Run radius search for each satellite and insert unique pairs into MaxHeap
    seen_pairs = set()
    heap = MaxHeap()
    risk_pairs = []

    t_search_start = time.perf_counter()
    if tree is not None and radius > 0 and len(sats) > 1:
        for sat in sats:
            neighbors = radius_search(tree, sat, radius)
            for neighbor in neighbors:
                pair_key = tuple(sorted([sat.id, neighbor.id]))
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    dist = euclidean_3d(sat, neighbor)
                    heap.insert({
                        'sat1': sat,
                        'sat2': neighbor,
                        'distance': dist
                    })
                    risk_pairs.append({
                        'sat1_id': sat.id,
                        'sat1_name': sat.name,
                        'sat2_id': neighbor.id,
                        'sat2_name': neighbor.name,
                        'distance': round(dist, 2)
                    })
    t_search_end = time.perf_counter()
    kd_search_ms = (t_search_end - t_search_start) * 1000.0

    kd_total_ms = kd_build_ms + kd_search_ms
    speedup = (bf_time_ms / kd_total_ms) if kd_total_ms > 0 else 1.0

    # Step 5: Extract top 10 most dangerous risks from MaxHeap (smallest distance = highest priority)
    top_risks = []
    top_items = heap.extract_all() if heap.size > 0 else []
    for item in top_items[:10]:
        top_risks.append({
            'sat1_id': item['sat1'].id,
            'sat1_name': item['sat1'].name,
            'sat2_id': item['sat2'].id,
            'sat2_name': item['sat2'].name,
            'distance': round(item['distance'], 2)
        })

    return {
        'n': n,
        'bf_time_ms': round(bf_time_ms, 3),
        'bf_comparisons': bf_comparisons,
        'kd_build_ms': round(kd_build_ms, 3),
        'kd_search_ms': round(kd_search_ms, 3),
        'kd_total_ms': round(kd_total_ms, 3),
        'speedup': round(speedup, 2),
        'risk_pairs': risk_pairs,
        'top_risks': top_risks
    }


# ── TODO (Member 3): Implement run_full_benchmark_suite ──────
def run_full_benchmark_suite(radius: float) -> list:
    """
    Runs run_benchmark for every N in BENCHMARK_SIZES.
    Results are sent to the frontend to draw the Chart.js graph.

    Args:
        radius: collision danger threshold in km

    Returns:
        list of benchmark dicts (one per N in BENCHMARK_SIZES)
    """
    results = []
    for n in BENCHMARK_SIZES:
        results.append(run_benchmark(n, radius))
    return results


# ── TODO (Member 3): Implement get_complexity_table() ────────
def get_complexity_table() -> list:
    """
    Returns structured data for the complexity comparison table in the UI.

    Returns:
        list of dicts:
        [
            { 'operation': 'Build / Preprocessing',
              'brute_force': 'O(1)',
              'kd_tree': 'O(N log N)' },
            { 'operation': 'Single Radius Query', ... },
            { 'operation': 'All-pairs Collision Check', ... },
            { 'operation': 'Space Complexity', ... },
        ]
    """
    return [
        {
            'operation': 'Build / Preprocessing',
            'brute_force': 'O(1)',
            'kd_tree': 'O(N log N)'
        },
        {
            'operation': 'Single Radius Query',
            'brute_force': 'O(N)',
            'kd_tree': 'O(log N) avg'
        },
        {
            'operation': 'All-pairs Collision Check',
            'brute_force': 'O(N²)',
            'kd_tree': 'O(N log N)'
        },
        {
            'operation': 'Space Complexity',
            'brute_force': 'O(N)',
            'kd_tree': 'O(N)'
        }
    ]


# ── TODO (Member 3): Implement get_live_stats(n, kd_comps) ───
def get_live_stats(n: int, kd_comps: int) -> dict:
    """
    Returns live stats for the counter panel shown in the UI sidebar.

    Args:
        n        : current number of satellites in simulation
        kd_comps : approximate number of nodes visited by K-D Tree

    Returns:
        dict {
            'bf_comparisons' : int,    ← exact = n*(n-1)//2
            'kd_comparisons' : int,    ← kd_comps
            'comps_saved'    : int,    ← bf - kd
            'speedup_label'  : str,    ← e.g. "499x faster"
            'bf_formula'     : str,    ← "N*(N-1)/2 = 499,500"
            'kd_formula'     : str     ← "≈ log₂(N) = 10"
        }
    """
    bf_comparisons = count_comparisons(n)
    kd_comparisons = max(0, kd_comps)
    comps_saved = max(0, bf_comparisons - kd_comparisons)

    if kd_comparisons > 0:
        ratio = bf_comparisons / kd_comparisons
        speedup_label = f"{round(ratio)}x faster"
    elif bf_comparisons > 0:
        speedup_label = f"{bf_comparisons}x faster"
    else:
        speedup_label = "1x"

    bf_formula = f"N*(N-1)/2 = {bf_comparisons:,}"
    if n > 0:
        log2_val = round(math.log2(n))
        kd_formula = f"≈ log₂(N) = {log2_val}"
    else:
        kd_formula = "≈ log₂(N) = 0"

    return {
        'bf_comparisons': bf_comparisons,
        'kd_comparisons': kd_comparisons,
        'comps_saved': comps_saved,
        'speedup_label': speedup_label,
        'bf_formula': bf_formula,
        'kd_formula': kd_formula
    }
