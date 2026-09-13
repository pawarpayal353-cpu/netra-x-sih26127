import random
import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.models.models import (
    Camera, VehicleObservation, Trajectory, TrajectoryPoint, Alert, TrafficMetric,
)
from app.services.city_topology import build_city_graph, ROADS
from app.analytics.engine import ROAD_CAPACITY, ROAD_BASELINE_SPEED, congestion_index
from app.trajectory.matcher import haversine_km

DEMO_VEHICLES = [
    "MH12AB1234", "MH14CD5678", "KA01EF9012", "DL01GH3456", "MH11JK7890", "GJ05LM1234",
]

VEHICLE_TYPES = ["car", "motorcycle", "auto-rickshaw", "bus", "truck", "van"]
STATE_CODES = ["MH", "KA", "DL", "GJ", "TN", "UP", "RJ", "PB"]


def random_plate(rnd: random.Random) -> str:
    state = rnd.choice(STATE_CODES)
    rto = f"{rnd.randint(1, 99):02d}"
    letters = "".join(rnd.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
    digits = f"{rnd.randint(1, 9999):04d}"
    return f"{state}{rto}{letters}{digits}"


def plate_hash(plate: str) -> str:
    return hashlib.sha256(plate.encode()).hexdigest()[:16]


def reset_and_seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed(db)
    finally:
        db.close()


def ensure_seeded():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Camera).count() == 0:
            _seed(db)
    finally:
        db.close()


def _seed(db: Session):
    rnd = random.Random(7)
    cameras, edges, road_cam_ids = build_city_graph()

    # --- cameras ---
    for c in cameras:
        status_roll = rnd.random()
        status = "ONLINE" if status_roll > 0.08 else ("DEGRADED" if status_roll > 0.03 else "OFFLINE")
        baseline_ocr = round(rnd.uniform(0.92, 0.98), 3)
        current_ocr = baseline_ocr if status == "ONLINE" else round(baseline_ocr - rnd.uniform(0.1, 0.25), 3)
        db.add(Camera(
            camera_id=c["camera_id"],
            name=c["name"],
            road_id=c["road_id"],
            latitude=c["latitude"],
            longitude=c["longitude"],
            direction=c["direction"],
            status=status,
            fps=rnd.choice([24, 25, 29, 30]),
            latency_ms=rnd.randint(45, 180),
            ocr_confidence=max(0.4, current_ocr),
            baseline_ocr_confidence=baseline_ocr,
            vehicles_per_min=rnd.randint(15, 60),
        ))
    db.commit()

    all_camera_ids = [c["camera_id"] for c in cameras]
    camera_by_id = {c["camera_id"]: c for c in cameras}

    # --- vehicle population: demo vehicles + synthetic ---
    vehicles = list(DEMO_VEHICLES)
    while len(vehicles) < 130:
        p = random_plate(rnd)
        if p not in vehicles:
            vehicles.append(p)

    now = datetime.now(timezone.utc)
    start_window = now - timedelta(hours=1, minutes=30)

    observations = []
    trajectories_built = 0

    for v_idx, plate in enumerate(vehicles):
        v_type = rnd.choice(VEHICLE_TYPES)
        # pick a road-chain to travel along, simulate camera-hopping journey
        road = rnd.choice(ROADS)
        chain = road_cam_ids[road]
        n_hops = rnd.randint(3, min(6, len(chain) + 2))
        path_cams = []
        cursor = rnd.randrange(len(chain))
        for h in range(n_hops):
            idx = min(len(chain) - 1, max(0, cursor))
            path_cams.append(chain[idx])
            cursor += 1 if rnd.random() > 0.15 else -1

        t = start_window + timedelta(minutes=rnd.randint(0, 80))
        traj_points_data = []
        seq = 0
        for cam_id in path_cams:
            cam = camera_by_id[cam_id]
            dt_gap = timedelta(minutes=rnd.randint(3, 11), seconds=rnd.randint(0, 59))
            t = t + dt_gap
            if t > now:
                break
            speed = rnd.randint(18, 62)
            ocr_conf = round(rnd.uniform(0.85, 0.99), 3)
            obs = VehicleObservation(
                camera_id=cam_id,
                plate_text=plate,
                plate_hash=plate_hash(plate),
                timestamp=t,
                latitude=cam["latitude"],
                longitude=cam["longitude"],
                direction=cam["direction"],
                vehicle_type=v_type,
                ocr_confidence=ocr_conf,
                image_quality=round(rnd.uniform(0.7, 0.97), 3),
                speed_kmh=speed,
            )
            db.add(obs)
            observations.append(obs)
            traj_points_data.append((cam_id, t, cam["latitude"], cam["longitude"], ocr_conf, speed, road))
            seq += 1

        if len(traj_points_data) >= 2:
            db.flush()
            total_dist = 0.0
            for i in range(len(traj_points_data) - 1):
                a, b = traj_points_data[i], traj_points_data[i + 1]
                total_dist += haversine_km(a[2], a[3], b[2], b[3])
            duration_h = max(0.01, (traj_points_data[-1][1] - traj_points_data[0][1]).total_seconds() / 3600)
            avg_speed = total_dist / duration_h
            confidence = round(rnd.uniform(0.85, 0.98), 3)

            traj = Trajectory(
                vehicle_identity=plate,
                start_time=traj_points_data[0][1],
                end_time=traj_points_data[-1][1],
                distance_km=round(total_dist, 2),
                avg_speed=round(avg_speed, 1),
                confidence=confidence,
            )
            db.add(traj)
            db.flush()
            for i, (cam_id, ts, lat, lng, conf, speed, road_id) in enumerate(traj_points_data):
                db.add(TrajectoryPoint(
                    trajectory_id=traj.trajectory_id,
                    camera_id=cam_id,
                    timestamp=ts,
                    latitude=lat,
                    longitude=lng,
                    sequence_number=i,
                    confidence=conf,
                    speed_kmh=speed,
                    road_id=road_id,
                ))
            trajectories_built += 1
    db.commit()

    # --- traffic metrics per road ---
    for road in ROADS:
        capacity = ROAD_CAPACITY[road]
        baseline_speed = ROAD_BASELINE_SPEED[road]
        vehicle_count = rnd.randint(int(capacity * 0.3), int(capacity * 1.1))
        congestion_roll = rnd.random()
        avg_speed = baseline_speed * (0.55 if congestion_roll > 0.75 else rnd.uniform(0.75, 1.05))
        idx = congestion_index(vehicle_count, capacity, avg_speed, baseline_speed)
        db.add(TrafficMetric(
            road_id=road,
            timestamp=now,
            vehicle_count=vehicle_count,
            avg_speed=round(avg_speed, 1),
            density=round(vehicle_count / capacity, 3),
            congestion_index=idx,
            baseline_speed=baseline_speed,
        ))
    db.commit()

    # --- alerts ---
    alert_templates = [
        ("ROUTE_ANOMALY", "HIGH"),
        ("WATCHLIST", "HIGH"),
        ("CONGESTION", "MEDIUM"),
        ("CAMERA_HEALTH", "LOW"),
        ("ROUTE_ANOMALY", "MEDIUM"),
    ]
    for i in range(12):
        kind, sev = rnd.choice(alert_templates)
        plate = rnd.choice(vehicles[:40])
        cam = rnd.choice(all_camera_ids)
        ts = now - timedelta(minutes=rnd.randint(1, 90))
        if kind == "ROUTE_ANOMALY":
            reason = "Unexpected route transition detected — flagged for authorized human review."
        elif kind == "WATCHLIST":
            reason = "Vehicle matched a watchlist entry — flagged for authorized human review."
        elif kind == "CONGESTION":
            reason = "Sustained congestion threshold exceeded on this corridor."
        else:
            reason = "OCR confidence dropped below the healthy operating threshold."
        db.add(Alert(
            type=kind,
            severity=sev,
            vehicle_identity=plate if kind in ("ROUTE_ANOMALY", "WATCHLIST") else None,
            camera_id=cam,
            timestamp=ts,
            reason=reason,
            confidence=round(rnd.uniform(0.7, 0.96), 2),
            status=rnd.choice(["NEW", "NEW", "ACKNOWLEDGED", "INVESTIGATING"]),
        ))
    db.commit()

    print(f"Seeded {len(cameras)} cameras, {len(observations)} observations, "
          f"{trajectories_built} trajectories, 12 alerts.")
