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
#    A: Type safety, auto __repr__, attribute access (sat.x not sat["x"]).
#       More Pythonic and easier to extend.
#
#  HOW TO CONTRIBUTE:
#    git add python/satellite.py
#    git commit -m "[Member1] feat: implement Satellite dataclass and generator"
# =============================================================

import random
import math
from dataclasses import dataclass
from typing import Literal

# ── Constants ────────────────────────────────────────────────
UNIVERSE_BOUND = 10_000   # ± km in each axis (x, y, z)
MAX_VELOCITY   = 7.8      # km/s  (≈ Low Earth Orbit speed)

SatType = Literal["active", "debris", "rocket"]


@dataclass
class Satellite:
    """
    Represents a single orbital object with 3D position and velocity.

    Attributes:
        id   : int   — unique identifier
        name : str   — e.g. "SAT-001", "DEB-042", "RKT-007"
        x    : float — position in km along X axis
        y    : float — position in km along Y axis
        z    : float — position in km along Z axis
        vx   : float — velocity in km/s along X axis
        vy   : float — velocity in km/s along Y axis
        vz   : float — velocity in km/s along Z axis
        type : str   — one of "active", "debris", "rocket"
    """
    id:   int
    name: str
    x:    float
    y:    float
    z:    float
    vx:   float
    vy:   float
    vz:   float
    type: str


def generate_satellites(n: int) -> list:
    """
    Creates a list of n randomly positioned Satellite objects.

    Distribution (approximate):
      - 60% active satellites
      - 30% space debris
      - 10% rocket bodies

    Naming convention:
      - active  -> "SAT-001", "SAT-002", ...
      - debris  -> "DEB-001", "DEB-002", ...
      - rocket  -> "RKT-001", "RKT-002", ...

    Position range : +/- UNIVERSE_BOUND km in each axis
    Velocity range : +/- MAX_VELOCITY km/s in each axis

    Args:
        n: number of satellite objects to generate

    Returns:
        list[Satellite]: list of n Satellite instances
    """
    satellites = []
    active_count = 0
    debris_count = 0
    rocket_count = 0

    for i in range(n):
        # Determine type by probability: 60% active, 30% debris, 10% rocket
        roll = random.random()
        if roll < 0.60:
            sat_type = "active"
            active_count += 1
            name = f"SAT-{active_count:03d}"
        elif roll < 0.90:
            sat_type = "debris"
            debris_count += 1
            name = f"DEB-{debris_count:03d}"
        else:
            sat_type = "rocket"
            rocket_count += 1
            name = f"RKT-{rocket_count:03d}"

        sat = Satellite(
            id   = i,
            name = name,
            x    = random.uniform(-UNIVERSE_BOUND, UNIVERSE_BOUND),
            y    = random.uniform(-UNIVERSE_BOUND, UNIVERSE_BOUND),
            z    = random.uniform(-UNIVERSE_BOUND, UNIVERSE_BOUND),
            vx   = random.uniform(-MAX_VELOCITY, MAX_VELOCITY),
            vy   = random.uniform(-MAX_VELOCITY, MAX_VELOCITY),
            vz   = random.uniform(-MAX_VELOCITY, MAX_VELOCITY),
            type = sat_type,
        )
        satellites.append(sat)

    return satellites


def predict_next_position(sat: "Satellite", dt: float) -> "Satellite":
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
    return Satellite(
        id   = sat.id,
        name = sat.name,
        x    = sat.x + sat.vx * dt,
        y    = sat.y + sat.vy * dt,
        z    = sat.z + sat.vz * dt,
        vx   = sat.vx,
        vy   = sat.vy,
        vz   = sat.vz,
        type = sat.type,
    )


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
