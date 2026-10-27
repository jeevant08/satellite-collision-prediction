# =============================================================
#  heap.py — Member 1's File
#  TASK: Implement a Max-Heap (Priority Queue) for collision ranking
# =============================================================
#
#  RUBRIC COVERAGE:
#    (b) Implementation Strategy — WHY Max-Heap over sorted list
#    (c) Live Demo              — powers the Top-10 Risk Panel
#
#  FACULTY QUESTIONS TO PREPARE:
#    Q: Why Max-Heap and not just sort the pairs list?
#    A: sorted() = O(N log N) every time new pairs arrive.
#       Heap insert = O(log N), extractMax = O(log N).
#       We only need TOP-K most dangerous, not a full sorted list.
#
#    Q: Why Max-Heap and not Min-Heap?
#    A: Priority = 1/distance. Smallest distance → largest priority.
#       The MAX of (1/distance) = the MINIMUM distance = highest risk.
#       So a Max-Heap naturally places the most dangerous pair on top.
#
#    Q: What is the heap property?
#    A: Every parent node has priority >= its children.
#       Root is always the element with maximum priority.
#
#  HOW TO CONTRIBUTE:
#    git add python/heap.py
#    git commit -m "[Member1] feat: implement MaxHeap with heapify operations"
# =============================================================


# ── TODO (Member 1): Implement the MaxHeap class ─────────────
class MaxHeap:
    """
    A Max-Heap (Priority Queue) that ranks collision risk pairs.

    Each element stored is a dict:
        {
            'sat1'    : Satellite,
            'sat2'    : Satellite,
            'distance': float        ← smaller distance = higher risk
        }

    Priority of an element = 1 / element['distance']
    The element with SMALLEST distance sits at the TOP (root).
    """

    def __init__(self):
        # Internal array — index 0 is the top (max priority)
        self._heap = []

    # ── TODO: size property ──────────────────────────────────
    @property
    def size(self) -> int:
        """Returns the number of elements in the heap."""
        # TODO: implement
        raise NotImplementedError("Member 1: implement size property")

    # ── TODO: insert(item) ───────────────────────────────────
    def insert(self, item: dict) -> None:
        """
        Inserts a collision risk pair into the heap.

        ALGORITHM:
            1. Append item to end of self._heap
            2. Call self._heapify_up(last_index)

        Time Complexity: O(log N)

        Args:
            item: dict with keys 'sat1', 'sat2', 'distance'
        """
        # TODO: implement
        raise NotImplementedError("Member 1: implement insert(item)")

    # ── TODO: extract_max() ──────────────────────────────────
    def extract_max(self) -> dict | None:
        """
        Removes and returns the highest-priority item (min distance = max risk).

        ALGORITHM:
            1. If heap is empty → return None
            2. Swap self._heap[0] with self._heap[-1]
            3. Pop self._heap[-1] — this is our result
            4. Call self._heapify_down(0) to restore heap property
            5. Return the popped item

        Time Complexity: O(log N)

        Returns:
            dict {'sat1', 'sat2', 'distance'} or None if empty
        """
        # TODO: implement
        raise NotImplementedError("Member 1: implement extract_max()")

    # ── TODO: peek() ─────────────────────────────────────────
    def peek(self) -> dict | None:
        """
        Returns the top item WITHOUT removing it.
        Time Complexity: O(1)
        """
        # TODO: implement
        raise NotImplementedError("Member 1: implement peek()")

    # ── TODO: extract_all() ──────────────────────────────────
    def extract_all(self) -> list:
        """
        Extracts all items in priority order (highest first).
        Empties the heap in the process.

        Returns:
            list of dicts sorted by priority (most dangerous first)
        """
        # TODO: keep calling extract_max() until heap is empty
        raise NotImplementedError("Member 1: implement extract_all()")

    # ── TODO: _heapify_up(index) ─────────────────────────────
    def _heapify_up(self, index: int) -> None:
        """
        Bubbles element at `index` UP until heap property is restored.

        ALGORITHM:
            While index > 0:
                parent_idx = (index - 1) // 2
                If priority(self._heap[index]) > priority(self._heap[parent_idx]):
                    swap them
                    index = parent_idx
                Else: break

        Time Complexity: O(log N)
        """
        # TODO: implement
        raise NotImplementedError("Member 1: implement _heapify_up(index)")

    # ── TODO: _heapify_down(index) ───────────────────────────
    def _heapify_down(self, index: int) -> None:
        """
        Pushes element at `index` DOWN until heap property is restored.

        ALGORITHM:
            While True:
                left  = 2 * index + 1
                right = 2 * index + 2
                largest = index

                If left < size AND priority(left) > priority(largest):
                    largest = left
                If right < size AND priority(right) > priority(largest):
                    largest = right

                If largest != index:
                    swap(index, largest)
                    index = largest
                Else: break

        Time Complexity: O(log N)
        """
        # TODO: implement
        raise NotImplementedError("Member 1: implement _heapify_down(index)")

    # ── HELPERS: already implemented — do NOT modify ─────────
    def _priority(self, item: dict) -> float:
        """Priority = 1/distance. Smaller distance → higher priority."""
        return 1.0 / item['distance'] if item['distance'] > 0 else float('inf')

    def _swap(self, i: int, j: int) -> None:
        self._heap[i], self._heap[j] = self._heap[j], self._heap[i]

    def to_list(self) -> list:
        """Returns a copy of the internal heap array (for debugging)."""
        return list(self._heap)
