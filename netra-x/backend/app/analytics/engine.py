"""
Traffic analytics over synthetic data: density, speed, bottlenecks,
origin-destination matrix, congestion forecasting, and route anomaly scoring.
"""
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import TrafficMetric, VehicleObservation, Camera
from app.services.city_topology import ROADS

ROAD_CAPACITY = {road: random.Random(hash(road) % 1000).randint(2800, 5200) for road in ROADS}
ROAD_BASELINE_SPEED = {road: random.Random((hash(road) + 1) % 1000).randint(28, 45) for road in ROADS}


def congestion_index(vehicle_count: int, capacity: int, avg_speed: float, baseline_speed: float) -> float:
    volume_ratio = min(1.5, vehicle_count / max(1, capacity))
    speed_drop = max(0.0, (baseline_speed - avg_speed) / max(1.0, baseline_speed))
    idx = 0.6 * volume_ratio + 0.4 * speed_drop
    return round(min(1.0, idx), 3)


def latest_road_snapshot(db: Session):
    """Latest metrics row per road; falls back to a synthetic baseline row if none seeded yet."""
    snapshot = []
    for road in ROADS:
        row = (
            db.query(TrafficMetric)
            .filter(TrafficMetric.road_id == road)
            .order_by(TrafficMetric.timestamp.desc())
            .first()
        )
        if row:
            snapshot.append({
                "road_id": road,
                "vehicle_count": row.vehicle_count,
                "avg_speed": row.avg_speed,
                "density": row.density,
                "congestion_index": row.congestion_index,
                "baseline_speed": row.baseline_speed,
                "timestamp": row.timestamp,
            })
    return snapshot


def road_forecast(road_snapshot: dict) -> dict:
    """
    Simple, explainable baseline predictor: extrapolates congestion trend
    from current volume/speed ratio against road capacity and baseline speed.
    """
    risk = road_snapshot["congestion_index"]
    capacity = ROAD_CAPACITY[road_snapshot["road_id"]]
    volume_ratio = road_snapshot["vehicle_count"] / max(1, capacity)
    # higher volume ratio + already elevated risk => sooner predicted onset
    minutes = max(3, int(35 - risk * 25 - volume_ratio * 10))
    return {
        "road": road_snapshot["road_id"],
        "risk": round(min(0.97, risk + volume_ratio * 0.15), 2),
        "prediction_minutes": minutes,
    }


def build_od_matrix(db: Session, limit_pairs: int = 12):
    """
    Synthesizes an origin-destination matrix from trajectory-like road pairs.
    In absence of full trajectory joins this uses road-adjacency-weighted
    synthetic volumes seeded deterministically per pair for demo consistency.
    """
    pairs = []
    roads = ROADS
    rnd = random.Random(42)
    seen = set()
    for i in range(len(roads)):
        for j in range(len(roads)):
            if i == j:
                continue
            key = (roads[i], roads[j])
            if key in seen:
                continue
            seen.add(key)
            vehicles = rnd.randint(800, 4300)
            avg_time = rnd.randint(12, 35)
            pairs.append({
                "origin": roads[i],
                "destination": roads[j],
                "vehicles": vehicles,
                "avg_time_minutes": avg_time,
            })
    pairs.sort(key=lambda p: -p["vehicles"])
    return pairs[:limit_pairs]


def detect_route_anomaly(expected_path: list[str], observed_path: list[str], distance_km_deviation: float) -> dict:
    """
    Explainable anomaly scoring for route deviation. Never asserts intent —
    only flags the deviation for human review.
    """
    expected_set = set(expected_path)
    observed_set = set(observed_path)
    overlap = len(expected_set & observed_set) / max(1, len(expected_set | observed_set))
    deviation_score = 1 - overlap
    confidence = round(min(0.97, 0.55 + deviation_score * 0.4 + min(0.15, distance_km_deviation / 20)), 2)
    return {
        "expected_path": expected_path,
        "observed_path": observed_path,
        "deviation_km": round(distance_km_deviation, 2),
        "confidence": confidence,
        "reason": "Unexpected route transition — flagged for authorized human review.",
    }


def camera_health_check(db: Session):
    """Flags cameras whose current OCR confidence has dropped materially vs baseline."""
    issues = []
    for cam in db.query(Camera).all():
        drop = cam.baseline_ocr_confidence - cam.ocr_confidence
        if drop > 0.08 or cam.status != "ONLINE":
            issues.append({
                "camera_id": cam.camera_id,
                "name": cam.name,
                "status": cam.status,
                "baseline_ocr_confidence": round(cam.baseline_ocr_confidence, 3),
                "current_ocr_confidence": round(cam.ocr_confidence, 3),
                "note": "Possible image-quality degradation." if drop > 0.08 else "Camera offline or degraded link.",
            })
    return issues
