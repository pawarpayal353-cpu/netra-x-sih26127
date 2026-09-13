import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import Camera, VehicleObservation, Trajectory, TrajectoryPoint, Alert, TrafficMetric
from app.services.anpr_engine import engine as anpr_engine
from app.services.seed import reset_and_seed
from app.trajectory.matcher import score_transition, infer_missing_camera, get_camera_graph
from app.analytics.engine import (
    latest_road_snapshot, road_forecast, build_od_matrix, detect_route_anomaly, camera_health_check,
)
from app.ai.analyst import answer_query
from app.simulation.live import manager, simulation_loop, set_simulation, is_simulation_on

router = APIRouter()


def _cam_to_dict(c: Camera) -> dict:
    return {
        "camera_id": c.camera_id, "name": c.name, "road_id": c.road_id,
        "latitude": c.latitude, "longitude": c.longitude, "direction": c.direction,
        "status": c.status, "fps": c.fps, "latency_ms": c.latency_ms,
        "ocr_confidence": c.ocr_confidence, "vehicles_per_min": c.vehicles_per_min,
    }


# ---------- Dashboard ----------
@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_cams = db.query(Camera).count()
    online = db.query(Camera).filter(Camera.status == "ONLINE").count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING"])).count()
    rows = latest_road_snapshot(db)
    avg_speed = round(sum(r["avg_speed"] for r in rows) / len(rows), 1) if rows else 0
    congestion_zones = sum(1 for r in rows if r["congestion_index"] > 0.55)
    vehicles_per_min = sum(c.vehicles_per_min for c in db.query(Camera).filter(Camera.status == "ONLINE").all())
    avg_ocr = db.query(func.avg(Camera.ocr_confidence)).scalar() or 0

    return {
        "cameras_online": online,
        "cameras_total": total_cams,
        "vehicles_per_min": vehicles_per_min,
        "active_alerts": active_alerts,
        "congestion_zones": congestion_zones,
        "avg_city_speed": avg_speed,
        "anpr_confidence": round(avg_ocr * 100, 1),
        "simulation_on": is_simulation_on(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- Cameras ----------
@router.get("/cameras")
def list_cameras(db: Session = Depends(get_db)):
    return [_cam_to_dict(c) for c in db.query(Camera).order_by(Camera.camera_id).all()]


@router.get("/cameras/{camera_id}")
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    c = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not c:
        raise HTTPException(404, "Camera not found")
    recent = (
        db.query(VehicleObservation)
        .filter(VehicleObservation.camera_id == camera_id)
        .order_by(VehicleObservation.timestamp.desc())
        .limit(10)
        .all()
    )
    return {
        **_cam_to_dict(c),
        "recent_observations": [
            {"plate": o.plate_text, "timestamp": o.timestamp.isoformat(), "confidence": o.ocr_confidence,
             "vehicle_type": o.vehicle_type} for o in recent
        ],
    }


@router.get("/cameras/{camera_id}/health")
def camera_health(camera_id: str, db: Session = Depends(get_db)):
    c = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not c:
        raise HTTPException(404, "Camera not found")
    drop = round(c.baseline_ocr_confidence - c.ocr_confidence, 3)
    return {
        "camera_id": c.camera_id, "status": c.status, "fps": c.fps, "latency_ms": c.latency_ms,
        "ocr_confidence": c.ocr_confidence, "baseline_ocr_confidence": c.baseline_ocr_confidence,
        "ocr_drop": drop, "degraded": drop > 0.08 or c.status != "ONLINE",
    }


# ---------- ANPR ----------
@router.post("/anpr/process")
def process_anpr(payload: dict = None):
    plate_hint = (payload or {}).get("plate_hint")
    result = anpr_engine.process_frame(plate_hint=plate_hint)
    return result


# ---------- Vehicles ----------
@router.get("/vehicles/search")
def search_vehicles(plate: str, db: Session = Depends(get_db)):
    plate = plate.upper().strip()
    observations = (
        db.query(VehicleObservation)
        .filter(VehicleObservation.plate_text == plate)
        .order_by(VehicleObservation.timestamp)
        .all()
    )
    if not observations:
        raise HTTPException(404, f"No observations found for {plate}")

    first, last = observations[0], observations[-1]
    traj = (
        db.query(Trajectory)
        .filter(Trajectory.vehicle_identity == plate)
        .order_by(Trajectory.confidence.desc())
        .first()
    )
    avg_conf = sum(o.ocr_confidence for o in observations) / len(observations)
    return {
        "plate": plate,
        "vehicle_type": observations[-1].vehicle_type,
        "ocr_confidence": round(avg_conf, 3),
        "observations_count": len(observations),
        "distance_km": traj.distance_km if traj else None,
        "avg_speed": traj.avg_speed if traj else None,
        "first_seen": first.timestamp.isoformat(),
        "last_seen": last.timestamp.isoformat(),
        "camera_sequence": [o.camera_id for o in observations],
        "has_trajectory": traj is not None,
    }


@router.get("/vehicles/{plate}/trajectory")
def get_vehicle_trajectory(plate: str, db: Session = Depends(get_db)):
    plate = plate.upper().strip()
    traj = (
        db.query(Trajectory)
        .filter(Trajectory.vehicle_identity == plate)
        .order_by(Trajectory.confidence.desc())
        .first()
    )
    if not traj:
        raise HTTPException(404, f"No trajectory found for {plate}")

    points = []
    for p in traj.points:
        cam = db.query(Camera).filter(Camera.camera_id == p.camera_id).first()
        points.append({
            "camera_id": p.camera_id,
            "camera_name": cam.name if cam else p.camera_id,
            "road_id": p.road_id,
            "timestamp": p.timestamp.isoformat(),
            "latitude": p.latitude,
            "longitude": p.longitude,
            "sequence_number": p.sequence_number,
            "confidence": p.confidence,
            "speed_kmh": p.speed_kmh,
            "direction": cam.direction if cam else None,
        })

    # score each consecutive transition for explainability
    transitions = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        s = score_transition(
            {"camera_id": a["camera_id"], "timestamp": traj.points[i].timestamp, "plate_text": plate,
             "ocr_confidence": a["confidence"]},
            {"camera_id": b["camera_id"], "timestamp": traj.points[i + 1].timestamp, "plate_text": plate,
             "ocr_confidence": b["confidence"]},
            "car", "car",
        )
        transitions.append(s)

    return {
        "vehicle": plate,
        "trajectory_id": traj.trajectory_id,
        "confidence": traj.confidence,
        "distance_km": traj.distance_km,
        "avg_speed": traj.avg_speed,
        "start_time": traj.start_time.isoformat(),
        "end_time": traj.end_time.isoformat(),
        "points": points,
        "transitions": transitions,
    }


@router.get("/vehicles/{plate}/missing-camera")
def missing_camera_inference(plate: str, cam_from: str, cam_to: str):
    return {"vehicle": plate, "candidates": infer_missing_camera(cam_from, cam_to)}


# ---------- Traffic ----------
@router.get("/traffic/live")
def traffic_live(db: Session = Depends(get_db)):
    return latest_road_snapshot(db)


@router.get("/traffic/heatmap")
def traffic_heatmap(db: Session = Depends(get_db)):
    rows = latest_road_snapshot(db)
    cams, _, _ = get_camera_graph()
    heat = []
    for c in cams:
        road_row = next((r for r in rows if r["road_id"] == c["road_id"]), None)
        intensity = road_row["congestion_index"] if road_row else 0.3
        heat.append({"latitude": c["latitude"], "longitude": c["longitude"], "intensity": intensity, "camera_id": c["camera_id"]})
    return heat


@router.get("/traffic/od")
def traffic_od(db: Session = Depends(get_db)):
    return build_od_matrix(db)


@router.get("/traffic/bottlenecks")
def traffic_bottlenecks(db: Session = Depends(get_db)):
    rows = latest_road_snapshot(db)
    rows.sort(key=lambda r: -r["congestion_index"])
    return rows[:6]


@router.get("/traffic/forecast")
def traffic_forecast(db: Session = Depends(get_db)):
    rows = latest_road_snapshot(db)
    return sorted([road_forecast(r) for r in rows], key=lambda f: -f["risk"])


# ---------- Mobility graph ----------
@router.get("/graph")
def mobility_graph(db: Session = Depends(get_db)):
    cams, edges, adjacency = get_camera_graph()
    cam_rows = {c.camera_id: c for c in db.query(Camera).all()}
    nodes = []
    for c in cams:
        row = cam_rows.get(c["camera_id"])
        nodes.append({
            **c,
            "vehicles_per_min": row.vehicles_per_min if row else 0,
            "status": row.status if row else "ONLINE",
        })
    edge_list = [{"from": a, "to": b, "road_id": road} for a, b, road in edges]
    return {
        "nodes": nodes,
        "edges": edge_list,
        "stats": {
            "nodes": len(nodes),
            "edges": len(edge_list),
            "active_flows": len({(e["from"], e["to"]) for e in edge_list if e["road_id"] != "Junction"}) // 2,
            "critical_nodes": sum(1 for n in nodes if n.get("vehicles_per_min", 0) > 55),
        },
    }


# ---------- Alerts ----------
@router.get("/alerts")
def list_alerts(category: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Alert)
    if category and category.upper() != "ALL":
        if category.upper() == "HIGH PRIORITY" or category.upper() == "HIGH":
            q = q.filter(Alert.severity == "HIGH")
        else:
            q = q.filter(Alert.type == category.upper().replace(" ", "_"))
    alerts = q.order_by(Alert.timestamp.desc()).limit(100).all()
    return [
        {
            "alert_id": a.alert_id, "type": a.type, "severity": a.severity,
            "vehicle_identity": a.vehicle_identity, "camera_id": a.camera_id,
            "timestamp": a.timestamp.isoformat(), "reason": a.reason,
            "confidence": a.confidence, "status": a.status,
        } for a in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, action: dict = None, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    new_status = (action or {}).get("status", "ACKNOWLEDGED").upper()
    if new_status not in ("ACKNOWLEDGED", "INVESTIGATING", "DISMISSED"):
        new_status = "ACKNOWLEDGED"
    a.status = new_status
    db.commit()
    return {"alert_id": alert_id, "status": a.status}


# ---------- AI ----------
@router.post("/ai/query")
def ai_query(payload: dict, db: Session = Depends(get_db)):
    query = (payload or {}).get("query", "").strip()
    if not query:
        raise HTTPException(400, "query is required")
    return answer_query(db, query)


# ---------- System ----------
@router.get("/system/health")
def system_health(db: Session = Depends(get_db)):
    cams = db.query(Camera).count()
    obs = db.query(VehicleObservation).count()
    return {
        "api": "OPERATIONAL",
        "database": "OPERATIONAL",
        "streaming": "OPERATIONAL",
        "ai_engine": "OPERATIONAL",
        "gis": "OPERATIONAL",
        "metrics": {
            "cameras_seeded": cams,
            "observations_total": obs,
            "websocket_clients": len(manager.active),
            "simulation_on": is_simulation_on(),
        },
    }


@router.post("/system/simulation")
def toggle_simulation(payload: dict):
    on = bool((payload or {}).get("on", True))
    set_simulation(on)
    return {"simulation_on": on}


@router.post("/system/reset-demo")
def reset_demo():
    reset_and_seed()
    return {"status": "reset_complete"}


@router.get("/system/camera-health-issues")
def camera_health_issues(db: Session = Depends(get_db)):
    return camera_health_check(db)


# ---------- Reports (lightweight synchronous generation) ----------
@router.get("/reports/{report_type}")
def generate_report(report_type: str, db: Session = Depends(get_db)):
    report_type = report_type.lower()
    if report_type == "daily-traffic":
        data = latest_road_snapshot(db)
    elif report_type == "vehicle-trajectory":
        trajs = db.query(Trajectory).order_by(Trajectory.confidence.desc()).limit(20).all()
        data = [{"vehicle": t.vehicle_identity, "distance_km": t.distance_km, "avg_speed": t.avg_speed,
                 "confidence": t.confidence} for t in trajs]
    elif report_type == "congestion":
        rows = latest_road_snapshot(db)
        data = sorted(rows, key=lambda r: -r["congestion_index"])
    elif report_type == "camera-health":
        data = camera_health_check(db)
    elif report_type == "alerts":
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(50).all()
        data = [{"type": a.type, "severity": a.severity, "vehicle_identity": a.vehicle_identity,
                 "status": a.status, "timestamp": a.timestamp.isoformat()} for a in alerts]
    else:
        raise HTTPException(404, "Unknown report type")
    return {"report_type": report_type, "generated_at": datetime.now(timezone.utc).isoformat(), "data": data}


# ---------- WebSocket ----------
@router.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # keep the connection alive; client is not required to send anything
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
