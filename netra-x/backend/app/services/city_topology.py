"""
Defines the fictional demo city's road network and the 42-camera graph.
Coordinates are synthetic, centered on an arbitrary point (no real city).
"""
import math

CITY_CENTER = (21.0000, 79.0000)  # arbitrary fictional coordinates

ROADS = [
    "Airport Road",
    "Ring Road",
    "Central Corridor",
    "Station Road",
    "Industrial Area",
    "University Road",
    "Market Road",
    "East Bypass",
    "West Bypass",
    "CBD",
]

# Each road gets a slice of cameras (id, sequence) forming a chain graph.
# Chains are cross-linked at a few junction cameras to form the full mobility graph.
ROAD_CAMERA_COUNTS = {
    "Airport Road": 5,
    "Ring Road": 6,
    "Central Corridor": 5,
    "Station Road": 4,
    "Industrial Area": 4,
    "University Road": 4,
    "Market Road": 4,
    "East Bypass": 4,
    "West Bypass": 3,
    "CBD": 3,
}
# total = 42

# Junctions: camera_id -> list of connected camera_ids (cross-road links),
# built programmatically below.


def _angle_for_road(index: int, total: int) -> float:
    return (2 * math.pi * index) / total


def build_city_graph():
    """
    Returns:
        cameras: list of dicts (camera_id, name, road_id, latitude, longitude, direction)
        edges: list of (from_camera_id, to_camera_id, road_id) directed edges
    """
    cameras = []
    edges = []
    cam_counter = 1
    road_camera_ids: dict[str, list[str]] = {}

    for r_idx, road in enumerate(ROADS):
        n = ROAD_CAMERA_COUNTS[road]
        angle = _angle_for_road(r_idx, len(ROADS))
        radius_step = 0.006
        ids = []
        for i in range(n):
            cam_id = f"C{cam_counter:02d}"
            cam_counter += 1
            dist = radius_step * (i + 1)
            lat = CITY_CENTER[0] + dist * math.cos(angle) + random_jitter(r_idx, i, 0)
            lng = CITY_CENTER[1] + dist * math.sin(angle) + random_jitter(r_idx, i, 1)
            direction = ["North", "South", "East", "West", "North-East", "North-West",
                         "South-East", "South-West"][(r_idx + i) % 8]
            cameras.append({
                "camera_id": cam_id,
                "name": f"{road} — {cam_id}",
                "road_id": road,
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "direction": direction,
            })
            ids.append(cam_id)
        road_camera_ids[road] = ids
        # sequential edges along the road (both directions of travel)
        for i in range(len(ids) - 1):
            edges.append((ids[i], ids[i + 1], road))
            edges.append((ids[i + 1], ids[i], road))

    # Cross-link roads at their innermost camera (near city center) to form a
    # connected mobility graph — this is what makes cross-camera trajectories
    # meaningful rather than isolated chains.
    inner_cams = [ids[0] for ids in road_camera_ids.values()]
    for i in range(len(inner_cams)):
        a = inner_cams[i]
        b = inner_cams[(i + 1) % len(inner_cams)]
        edges.append((a, b, "Junction"))
        edges.append((b, a, "Junction"))

    return cameras, edges, road_camera_ids


def random_jitter(a, b, c):
    # deterministic pseudo-jitter so layout is stable across restarts
    seed = (a * 97 + b * 31 + c * 13) % 1000
    return ((seed / 1000) - 0.5) * 0.0015
