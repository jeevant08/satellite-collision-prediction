# =============================================================
#  satellite.py — Member 1's File
#  TASK: Define the Satellite data class and generator function
# =============================================================
#
#  RUBRIC COVERAGE:
#    (b) Implementation Strategy — justify WHY this data shape
#    (c) Live Demo              — all other modules import this
#
#  FACULTY QUESTIONS TO PREPARE:
#    Q: Why store velocity alongside position?
#    A: Allows O(1) position prediction without re-querying.
#       Essential for real-time simulation of orbital movement.
#
#    Q: Why a dataclass and not a plain dict?
#    A: Type safety, auto __repr__, attribute access (sat.x not sat['x']).
#       More Pythonic and easier to extend.
#
#  HOW TO CONTRIBUTE:
#    git add python/satellite.py
#    git commit -m "[Member1] feat: implement Satellite dataclass and generator"
# =============================================================

import random
import math
from dataclasses import dataclass, field
from typing import Literal

# ── Constants ────────────────────────────────────────────────
UNIVERSE_BOUND = 10_000   # ± km in each axis (x, y, z)
MAX_VELOCITY   = 7.8      # km/s  (≈ Low Earth Orbit speed)

SatType = Literal["active", "debris", "rocket"]

# ── TODO (Member 1): Define the Satellite dataclass ──────────
# Fields required:
#   id   : int    — unique identifier
#   name : str    — e.g. "SAT-001", "DEBRIS-042", "RKT-007"
#   x    : float  — position in km along X axis
#   y    : float  — position in km along Y axis
#   z    : float  — position in km along Z axis
#   vx   : float  — velocity in km/s along X axis
#   vy   : float  — velocity in km/s along Y axis
#   vz   : float  — velocity in km/s along Z axis
#   type : str    — one of "active", "debris", "rocket"
#
# Use @dataclass decorator for clean syntax.
# Example skeleton:
#
#   @dataclass
#   class Satellite:
#       id:   int
#       name: str
#       ...
#
# TODO: implement the Satellite class below

raise NotImplementedError("Member 1: implement the Satellite dataclass")


# ── TODO (Member 1): Implement generate_satellites(n) ────────
def generate_satellites(n: int) -> list:
    """
    Creates a list of n randomly positioned Satellite objects.

    Distribution (approximate):
      - 60% active satellites
      - 30% space debris
      - 10% rocket bodies

    Naming convention:
      - active  → "SAT-001", "SAT-002", ...
      - debris  → "DEB-001", "DEB-002", ...
      - rocket  → "RKT-001", "RKT-002", ...

    Position range : ± UNIVERSE_BOUND km in each axis
    Velocity range : ± MAX_VELOCITY km/s in each axis

    Args:
        n: number of satellite objects to generate

    Returns:
        list[Satellite]: list of n Satellite instances
    """
    # TODO: implement this function
    # HINT: use random.uniform(-UNIVERSE_BOUND, UNIVERSE_BOUND) for position
    # HINT: use random.uniform(-MAX_VELOCITY, MAX_VELOCITY) for velocity
    raise NotImplementedError("Member 1: implement generate_satellites(n)")


# ── TODO (Member 1): Implement predict_next_position(sat, dt) ─
def predict_next_position(sat, dt: float):
    """
    Returns a NEW Satellite with position updated by dt seconds.
    Does NOT mutate the original satellite.

    Formula:
        new_x = sat.x + sat.vx * dt
        new_y = sat.y + sat.vy * dt
        new_z = sat.z + sat.vz * dt

    Args:
        sat: Satellite instance
        dt : time step in seconds

    Returns:
        Satellite: new object with updated position, same velocity
    """
    # TODO: implement this function
    # HINT: create a new Satellite with updated x, y, z but same vx, vy, vz
    raise NotImplementedError("Member 1: implement predict_next_position(sat, dt)")


# ── HELPER: already implemented — do NOT modify ───────────────
def euclidean_3d(a, b) -> float:
    """
    Computes 3D Euclidean distance between two satellites in km.
    Used by kdtree.py, bruteforce.py, and analytics.py.
    """
    return math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    )


def satellite_to_dict(sat) -> dict:
    """
    Converts a Satellite to a JSON-serialisable dict.
    Used by app.py to send data to the JS frontend.
    """
    return {
        "id":   sat.id,
        "name": sat.name,
        "x":    sat.x,
        "y":    sat.y,
        "z":    sat.z,
        "vx":   sat.vx,
        "vy":   sat.vy,
        "vz":   sat.vz,
        "type": sat.type,
    }
