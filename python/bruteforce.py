# =============================================================
#  bruteforce.py — Member 3's File
#  TASK: Implement the O(N²) brute-force collision checker
# =============================================================
#
#  RUBRIC COVERAGE:
#    (c) Live Demo        — run side-by-side to prove K-D Tree wins
#    (d) Time Complexity  — YOU prove why this is O(N²)
#
#  FACULTY QUESTIONS TO PREPARE:
#    Q: Why is brute force O(N²)?
#    A: We check every unique pair (i, j) where i < j.
#       Total pairs = N*(N-1)/2 ≈ O(N²).
#       For N=10,000 → ~50 million distance calculations. Infeasible!
#
#    Q: Why do we implement this if it's slow?
#    A: It's the BASELINE. Without it we can't show HOW MUCH
#       faster the K-D Tree is. It's also used for correctness
#       verification — both algorithms should return the same pairs.
#
#  HOW TO CONTRIBUTE:
#    git add python/bruteforce.py
#    git commit -m "[Member3] feat: implement brute force O(N^2) checker"
# =============================================================

import time
from satellite import euclidean_3d


# ── Helper to extract an order-independent pair key ───────────
def _extract_pair_key(pair):
    """Helper to extract an order-independent (id1, id2) identifier from any pair representation."""
    if isinstance(pair, dict):
        if 'sat1' in pair and 'sat2' in pair:
            s1 = pair['sat1']
            s2 = pair['sat2']
            id1 = s1.id if hasattr(s1, 'id') else s1.get('id') if isinstance(s1, dict) else s1
            id2 = s2.id if hasattr(s2, 'id') else s2.get('id') if isinstance(s2, dict) else s2
            return tuple(sorted([id1, id2]))
        if 'sat1_id' in pair and 'sat2_id' in pair:
            return tuple(sorted([pair['sat1_id'], pair['sat2_id']]))
    elif isinstance(pair, (tuple, list)) and len(pair) >= 2:
        s1, s2 = pair[0], pair[1]
        id1 = s1.id if hasattr(s1, 'id') else s1.get('id') if isinstance(s1, dict) else s1
        id2 = s2.id if hasattr(s2, 'id') else s2.get('id') if isinstance(s2, dict) else s2
        return tuple(sorted([id1, id2]))
    return None


# ── TODO (Member 3): Implement brute_force_collision_check ───
def brute_force_collision_check(satellites: list, radius: float) -> dict:
    """
    Checks EVERY pair of satellites for collision risk.

    ALGORITHM:
        comparisons = 0
        pairs = []
        For i in range(len(satellites)):
            For j in range(i+1, len(satellites)):
                comparisons += 1
                dist = euclidean_3d(satellites[i], satellites[j])
                If dist < radius:
                    pairs.append({
                        'sat1'    : satellites[i],
                        'sat2'    : satellites[j],
                        'distance': dist
                    })

    Time Complexity: O(N²)
        → Exactly N*(N-1)/2 distance calculations

    Args:
        satellites : list of Satellite objects
        radius     : danger threshold distance in km

    Returns:
        dict {
            'pairs'      : list of {'sat1', 'sat2', 'distance'},
            'comparisons': int,      ← exact count of distance calcs
            'time_ms'    : float     ← wall-clock time in milliseconds
        }
    """
    start_time = time.perf_counter()

    comparisons = 0
    pairs = []
    n = len(satellites)

    if n >= 2:
        for i in range(n):
            sat_i = satellites[i]
            for j in range(i + 1, n):
                comparisons += 1
                dist = euclidean_3d(sat_i, satellites[j])
                if radius > 0 and dist <= radius:
                    pairs.append({
                        'sat1': sat_i,
                        'sat2': satellites[j],
                        'distance': dist
                    })

    end_time = time.perf_counter()
    time_ms = (end_time - start_time) * 1000.0

    return {
        'pairs': pairs,
        'comparisons': comparisons,
        'time_ms': round(time_ms, 3)
    }


# ── TODO (Member 3): Implement count_comparisons(n) ─────────
def count_comparisons(n: int) -> int:
    """
    Returns the EXACT number of comparisons brute force makes for N satellites.
    This is displayed in the complexity panel in the UI.

    Mathematical formula: N * (N - 1) / 2

    Example:
        count_comparisons(10)    →   45
        count_comparisons(1000)  →   499500
        count_comparisons(10000) →   49995000

    Args:
        n: number of satellites

    Returns:
        int: exact comparison count
    """
    if n < 2:
        return 0
    return n * (n - 1) // 2


# ── TODO (Member 3): Implement verify_results ────────────────
def verify_results(bf_pairs: list, kd_pairs: list) -> dict:
    """
    Compares brute-force results with K-D Tree results.
    Both should find the SAME collision pairs (same pairs, possibly different order).

    Used to verify correctness of the K-D Tree implementation.

    Args:
        bf_pairs: list of pairs from brute_force_collision_check
        kd_pairs: list of pairs from K-D Tree radius_search

    Returns:
        dict {
            'match'         : bool,   ← True if both found same pairs
            'bf_count'      : int,    ← number of pairs brute force found
            'kd_count'      : int,    ← number of pairs K-D Tree found
            'missing_in_kd' : list,   ← pairs BF found but KD missed
            'extra_in_kd'   : list    ← pairs KD found but BF didn't
        }
    """
    bf_map = {}
    for p in bf_pairs:
        key = _extract_pair_key(p)
        if key is not None:
            bf_map[key] = p

    kd_map = {}
    for p in kd_pairs:
        key = _extract_pair_key(p)
        if key is not None:
            kd_map[key] = p

    bf_keys = set(bf_map.keys())
    kd_keys = set(kd_map.keys())

    missing_keys = bf_keys - kd_keys
    extra_keys = kd_keys - bf_keys

    missing_in_kd = [bf_map[k] for k in missing_keys]
    extra_in_kd = [kd_map[k] for k in extra_keys]

    return {
        'match': len(missing_keys) == 0 and len(extra_keys) == 0,
        'bf_count': len(bf_pairs),
        'kd_count': len(kd_pairs),
        'missing_in_kd': missing_in_kd,
        'extra_in_kd': extra_in_kd
    }
