import asyncio
import random
import hashlib
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import Camera, VehicleObservation, Alert, TrafficMetric
from app.services.seed import DEMO_VEHICLES, VEHICLE_TYPES, random_plate, plate_hash
from app.analytics.engine import congestion_index, ROAD_CAPACITY, ROAD_BASELINE_SPEED


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
_simulation_on = True
_rnd = random.Random()


def is_simulation_on() -> bool:
    return _simulation_on


def set_simulation(on: bool):
    global _simulation_on
    _simulation_on = on


async def simulation_loop():
    """Runs forever in the background, emitting realistic live events over the websocket."""
    while True:
        await asyncio.sleep(3)
        if not _simulation_on:
            continue
        db = SessionLocal()
        try:
            event = await _tick(db)
            if event:
                await manager.broadcast(event)
        except Exception as e:
            print("simulation tick error:", e)
        finally:
            db.close()


async def _tick(db: Session):
    cams = db.query(Camera).filter(Camera.status == "ONLINE").all()
    if not cams:
        return None
    cam = _rnd.choice(cams)

    use_demo = _rnd.random() < 0.12
    plate = _rnd.choice(DEMO_VEHICLES) if use_demo else random_plate(_rnd)

    obs = VehicleObservation(
        camera_id=cam.camera_id,
        plate_text=plate,
        plate_hash=plate_hash(plate),
        timestamp=datetime.now(timezone.utc),
        latitude=cam.latitude,
        longitude=cam.longitude,
        direction=cam.direction,
        vehicle_type=_rnd.choice(VEHICLE_TYPES),
        ocr_confidence=round(_rnd.uniform(0.85, 0.99), 3),
        image_quality=round(_rnd.uniform(0.75, 0.97), 3),
        speed_kmh=_rnd.randint(15, 65),
    )
    db.add(obs)

    # nudge camera vehicles/min slightly for a "live" feel
    cam.vehicles_per_min = max(5, min(90, cam.vehicles_per_min + _rnd.randint(-2, 2)))
    db.add(cam)
    db.commit()

    alert_payload = None
    if _rnd.random() < 0.05:
        alert = Alert(
            type=_rnd.choice(["ROUTE_ANOMALY", "CONGESTION", "WATCHLIST"]),
            severity=_rnd.choice(["HIGH", "MEDIUM"]),
            vehicle_identity=plate,
            camera_id=cam.camera_id,
            timestamp=datetime.now(timezone.utc),
            reason="Unexpected route transition detected — flagged for authorized human review.",
            confidence=round(_rnd.uniform(0.75, 0.95), 2),
            status="NEW",
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        alert_payload = {
            "alert_id": alert.alert_id,
            "type": alert.type,
            "severity": alert.severity,
            "vehicle_identity": alert.vehicle_identity,
            "camera_id": alert.camera_id,
            "reason": alert.reason,
            "confidence": alert.confidence,
            "timestamp": alert.timestamp.isoformat(),
        }

    return {
        "kind": "live_event",
        "observation": {
            "camera_id": cam.camera_id,
            "camera_name": cam.name,
            "plate": plate,
            "ocr_confidence": obs.ocr_confidence,
            "vehicle_type": obs.vehicle_type,
            "timestamp": obs.timestamp.isoformat(),
            "latitude": obs.latitude,
            "longitude": obs.longitude,
        },
        "alert": alert_payload,
        "simulation_on": _simulation_on,
    }
