

from collections import deque
from graph import SERVICE_GRAPH

def count_anomalous_descendants(svc, anomalous_set):
    visited, count, queue = set(), 0, deque(SERVICE_GRAPH.get(svc, []))
    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)
        if node in anomalous_set:
            count += 1
        queue.extend(SERVICE_GRAPH.get(node, []))
    return count

def identify_root_cause(ml_scores):
    """
    ml_scores: dict of service -> {"p_value": float, "anomaly_confidence": float}
    Returns: (root_service or None, set of affected services)
    """
    anomalous = {s for s, v in ml_scores.items() if v["p_value"] < 0.05}
    if not anomalous:
        return None, set()

    best, best_score = None, -1
    for svc in anomalous:
        desc = count_anomalous_descendants(svc, anomalous)
        score = ml_scores[svc]["anomaly_confidence"] * (1 + desc)
        if score > best_score:
            best, best_score = svc, score

    return best, anomalous

def get_impact_path(root, affected):
    """BFS from root through graph, return path to leaves in affected set."""
    paths = []
    queue = deque([[root]])
    while queue:
        path = queue.popleft()
        current = path[-1]
        children = [c for c in SERVICE_GRAPH.get(current, []) if c in affected]
        if not children:
            paths.append(path)
        else:
            for child in children:
                if child not in path:  # avoid cycles
                    queue.append(path + [child])
    return paths if paths else [[root]]