"""
Trajectory scoring and reconstruction.

Trajectory Score combines:
  - OCR similarity between consecutive observations of the "same" plate
  - temporal consistency (plausible time gap given road distance)
  - geographic consistency (camera graph adjacency)
  - direction consistency
  - vehicle-type similarity
  - camera graph consistency (edge exists in the city mobility graph)
"""
import math
from datetime import datetime

from app.services.city_topology import build_city_graph

_CAMERAS, _EDGES, _ROAD_CAM_IDS = build_city_graph()
_CAMERA_BY_ID = {c["camera_id"]: c for c in _CAMERAS}

_ADJACENCY: dict[str, set[str]] = {}
for a, b, road in _EDGES:
    _ADJACENCY.setdefault(a, set()).add(b)


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def plate_similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if not a or not b or len(a) != len(b):
        return 0.4
    matches = sum(1 for x, y in zip(a, b) if x == y)
    return matches / len(a)


def edge_exists(cam_a: str, cam_b: str) -> bool:
    return cam_b in _ADJACENCY.get(cam_a, set())


def score_transition(obs_a, obs_b, vehicle_type_a: str, vehicle_type_b: str) -> dict:
    """
    obs_a / obs_b: dicts with camera_id, timestamp (datetime), plate_text, ocr_confidence
    Returns a breakdown + composite score in [0, 1].
    """
    cam_a = _CAMERA_BY_ID.get(obs_a["camera_id"])
    cam_b = _CAMERA_BY_ID.get(obs_b["camera_id"])
    if not cam_a or not cam_b:
        return {"score": 0.0}

    dist_km = haversine_km(cam_a["latitude"], cam_a["longitude"], cam_b["latitude"], cam_b["longitude"])
    dt_seconds = max(1.0, (obs_b["timestamp"] - obs_a["timestamp"]).total_seconds())
    implied_speed_kmh = (dist_km / dt_seconds) * 3600

    ocr_sim = plate_similarity(obs_a["plate_text"], obs_b["plate_text"])
    temporal = 1.0 if 5 <= implied_speed_kmh <= 90 else max(0.0, 1 - abs(implied_speed_kmh - 45) / 100)
    geo = 1.0 if edge_exists(cam_a["camera_id"], cam_b["camera_id"]) else 0.35
    direction = 0.9 if cam_a["road_id"] == cam_b["road_id"] else 0.7
    vehicle_sim = 1.0 if vehicle_type_a == vehicle_type_b else 0.5
    graph_consistency = geo

    composite = (
        0.30 * ocr_sim
        + 0.15 * temporal
        + 0.20 * geo
        + 0.10 * direction
        + 0.10 * vehicle_sim
        + 0.15 * graph_consistency
    )
    return {
        "score": round(min(0.995, composite), 3),
        "ocr_similarity": round(ocr_sim, 3),
        "temporal_consistency": round(temporal, 3),
        "geographic_consistency": round(geo, 3),
        "direction_consistency": round(direction, 3),
        "vehicle_similarity": round(vehicle_sim, 3),
        "camera_graph_consistency": round(graph_consistency, 3),
        "implied_speed_kmh": round(implied_speed_kmh, 1),
        "distance_km": round(dist_km, 3),
    }


def infer_missing_camera(cam_from: str, cam_to: str, top_n: int = 3) -> list[dict]:
    """
    Given two non-adjacent cameras, propose probable intermediate cameras
    using the graph's shared-neighbor structure. Purely inferential —
    callers must label results as unconfirmed.
    """
    neighbors_from = _ADJACENCY.get(cam_from, set())
    neighbors_to = {c for c, nbrs in _ADJACENCY.items() if cam_to in nbrs}

    candidates = list(neighbors_from & neighbors_to)
    if not candidates:
        # fall back to any camera adjacent to "from"
        candidates = list(neighbors_from)[:top_n]

    results = []
    total_candidates = max(1, len(candidates))
    remaining = 100
    for i, cam in enumerate(candidates[:top_n]):
        prob = max(5, round(100 / total_candidates) - i * 8)
        remaining -= prob
        results.append({
            "path": [cam_from, cam, cam_to],
            "probability": prob,
            "inferred": True,
        })
    if remaining > 0 and results:
        results.append({"path": None, "label": "Other / undetected", "probability": remaining, "inferred": True})
    return results


def get_camera_graph():
    return _CAMERAS, _EDGES, _ADJACENCY


def get_camera(camera_id: str):
    return _CAMERA_BY_ID.get(camera_id)
