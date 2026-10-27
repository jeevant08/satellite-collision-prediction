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
    # TODO: implement this function
    # HINT: use time.time() before and after → multiply diff by 1000 for ms
    raise NotImplementedError("Member 3: implement brute_force_collision_check")


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
    # TODO: one line — just return the formula
    raise NotImplementedError("Member 3: implement count_comparisons(n)")


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
    # TODO: implement this function
    # HINT: convert each pair to a frozenset of ids for easy comparison
    # e.g. set of frozenset({sat1.id, sat2.id}) for both lists, then compare
    raise NotImplementedError("Member 3: implement verify_results")
