# =============================================================
#  kdtree.py — Member 1's File
#  TASK: Implement a 3D K-D Tree for spatial nearest-neighbour search
# =============================================================


from satellite import euclidean_3d

# Axes cycle by depth: 0->x, 1->y, 2->z, 3->x ...
AXES = ["x", "y", "z"]


# ── KD-Tree Node ─────────────────────────────────────────────
class KDNode:
    """
    Represents one node in the K-D Tree.

    Attributes:
        point  : Satellite  — the satellite stored at this node (the median)
        axis   : str        — splitting axis ("x", "y", or "z")
        left   : KDNode|None — subtree with points LESS than median on axis
        right  : KDNode|None — subtree with points GREATER than median on axis
    """
    def __init__(self, point, axis, left=None, right=None):
        self.point = point
        self.axis  = axis
        self.left  = left
        self.right = right

    def __repr__(self):
        return f"KDNode(id={self.point.id}, axis={self.axis})"


def build_kd_tree(points: list, depth: int = 0):
    """
    Recursively builds a balanced 3D K-D Tree from a list of satellites.

    ALGORITHM:
        1. If points is empty -> return None  (base case)
        2. axis = AXES[depth % 3]             (cycle x -> y -> z -> x ...)
        3. Sort points by satellite.axis value
        4. median_idx = len(points) // 2
        5. Create node with points[median_idx] as the splitting point
        6. node.left  = build_kd_tree(points[:median_idx],      depth+1)
        7. node.right = build_kd_tree(points[median_idx+1:],    depth+1)
        8. Return node

    WHY MEDIAN? Guarantees a balanced tree -> height = log2(N) ->
    ensures O(log N) search instead of O(N) worst case.

    Time Complexity: O(N log N)
      — sorting N elements at each of log(N) levels

    Args:
        points : list of Satellite objects
        depth  : current recursion depth (default 0)

    Returns:
        KDNode | None
    """
    if not points:
        return None

    axis = AXES[depth % 3]

    # Sort on the current axis to find the median
    sorted_pts = sorted(points, key=lambda s: getattr(s, axis))
    median_idx = len(sorted_pts) // 2

    return KDNode(
        point = sorted_pts[median_idx],
        axis  = axis,
        left  = build_kd_tree(sorted_pts[:median_idx],       depth + 1),
        right = build_kd_tree(sorted_pts[median_idx + 1:],   depth + 1),
    )


def radius_search(node, target, radius: float, depth: int = 0, results: list = None) -> list:
    """
    Finds all satellites within `radius` km of `target`.

    ALGORITHM:
        1. Base case: if node is None -> return results
        2. dist = euclidean_3d(target, node.point)
        3. If dist <= radius AND node.point.id != target.id
               -> append node.point to results
        4. axis_dist = abs(getattr(target, node.axis)
                           - getattr(node.point, node.axis))
        5. Decide near/far side:
               near = left  if target[axis] < node.point[axis] else right
               far  = the other subtree
        6. Always recurse into near side
        7. Recurse into far side ONLY IF axis_dist <= radius
           (PRUNING: if axis_dist > radius, entire far subtree is out of range)

    Time Complexity: O(log N) average — branch pruning skips subtrees

    Args:
        node    : current KDNode (start with root)
        target  : Satellite we are searching FROM
        radius  : danger threshold in km
        depth   : current depth (to know the axis)
        results : accumulator list (pass None -> auto-initialised to [])

    Returns:
        list of Satellite objects within radius (excluding target itself)
    """
    if results is None:
        results = []

    if node is None:
        return results

    # Check current node
    dist = euclidean_3d(target, node.point)
    if dist <= radius and node.point.id != target.id:
        results.append(node.point)

    # Axis distance for pruning
    axis_dist = abs(getattr(target, node.axis) - getattr(node.point, node.axis))

    # Determine near and far sides
    if getattr(target, node.axis) < getattr(node.point, node.axis):
        near = node.left
        far  = node.right
    else:
        near = node.right
        far  = node.left

    # Always search near side
    radius_search(near, target, radius, depth + 1, results)

    # Only search far side if splitting plane could contain points within radius
    if axis_dist <= radius:
        radius_search(far, target, radius, depth + 1, results)

    return results


def nearest_neighbor(node, target, depth: int = 0, best: dict = None) -> dict:
    """
    Finds the single closest satellite to `target` in the K-D Tree.

    ALGORITHM (same idea as radius_search, but track one best):
        1. If node is None -> return best
        2. dist = euclidean_3d(target, node.point)
        3. If dist < best["distance"] AND node.point.id != target.id
               -> update best = {"satellite": node.point, "distance": dist}
        4. axis_dist = abs(target[axis] - node.point[axis])
        5. Search near side first
        6. Search far side only if axis_dist < best["distance"]
        7. Return best

    Args:
        node   : current KDNode
        target : query Satellite
        depth  : current depth
        best   : dict {"satellite": ..., "distance": ...}

    Returns:
        dict {"satellite": Satellite, "distance": float}
    """
    if best is None:
        best = {"satellite": None, "distance": float("inf")}

    if node is None:
        return best

    # Evaluate current node
    dist = euclidean_3d(target, node.point)
    if node.point.id != target.id and dist < best["distance"]:
        best["satellite"] = node.point
        best["distance"]  = dist

    # Axis distance for pruning
    axis_dist = abs(getattr(target, node.axis) - getattr(node.point, node.axis))

    # Near/far sides
    if getattr(target, node.axis) < getattr(node.point, node.axis):
        near = node.left
        far  = node.right
    else:
        near = node.right
        far  = node.left

    # Always search near side
    nearest_neighbor(near, target, depth + 1, best)

    # Only search far side if it could contain a closer point
    if axis_dist < best["distance"]:
        nearest_neighbor(far, target, depth + 1, best)

    return best


# ── HELPER: already implemented — do NOT modify ───────────────
def get_tree_height(node) -> int:
    """Returns height of the K-D Tree. Used by the visualizer."""
    if node is None:
        return 0
    return 1 + max(get_tree_height(node.left), get_tree_height(node.right))


def tree_to_dict(node) -> dict | None:
    """
    Serialises the K-D Tree to a nested dict for sending to the JS frontend.
    Used by app.py -> /api/tree endpoint.
    Includes id, name, type, and coordinates so frontend can distinguish
    satellites and debris in data structure views.
    """
    if node is None:
        return None
    return {
        "point": {
            "id":   node.point.id,
            "name": getattr(node.point, "name", f"OBJ-{node.point.id:03d}"),
            "type": getattr(node.point, "type", "active"),
            "x":    round(node.point.x, 2),
            "y":    round(node.point.y, 2),
            "z":    round(node.point.z, 2),
        },
        "axis":  node.axis,
        "left":  tree_to_dict(node.left),
        "right": tree_to_dict(node.right),
    }

