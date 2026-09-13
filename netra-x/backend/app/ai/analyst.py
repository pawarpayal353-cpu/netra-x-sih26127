"""
NETRA AI — City Traffic Analyst.

This is NOT a call to an external LLM. It is a local analytics-to-language
service: it inspects real application state (traffic metrics, cameras,
alerts, trajectories) and renders an explanatory answer from it. Swapping
in a hosted LLM later only requires replacing `answer_query`'s prose
generation step — the data-gathering functions stay the same.
"""
import re
from sqlalchemy.orm import Session

from app.models.models import Camera, Alert, TrafficMetric
from app.analytics.engine import latest_road_snapshot, ROAD_BASELINE_SPEED, camera_health_check
from app.services.city_topology import ROADS


def _find_road_mentioned(query: str):
    q = query.lower()
    for road in ROADS:
        if road.lower() in q or road.lower().replace(" ", "") in q.replace(" ", ""):
            return road
    return None


def _find_plate_mentioned(query: str):
    m = re.search(r"\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{3,4})\b", query.upper())
    return m.group(1).replace(" ", "") if m else None


def answer_query(db: Session, query: str) -> dict:
    road = _find_road_mentioned(query)
    plate = _find_plate_mentioned(query)
    q_lower = query.lower()

    if road and ("congest" in q_lower or "why" in q_lower or "busy" in q_lower):
        return _explain_congestion(db, road)

    if "busiest" in q_lower or "corridor" in q_lower and "busiest" in q_lower:
        return _busiest_corridors(db)

    if "speed" in q_lower and ("abnormal" in q_lower or "reduc" in q_lower or "drop" in q_lower):
        return _abnormal_speed_roads(db)

    if plate or ("trajectory" in q_lower and re.search(r"[A-Z0-9]{6,}", query.upper())):
        target = plate or re.search(r"[A-Z0-9]{6,}", query.upper()).group(0)
        return _trajectory_summary(db, target)

    if "predict" in q_lower or "forecast" in q_lower:
        return _predict_congestion(db)

    if "ocr" in q_lower or "degraded" in q_lower:
        return _degraded_cameras(db)

    # default: general city status grounded in live data
    return _general_status(db)


def _explain_congestion(db: Session, road: str) -> dict:
    row = (
        db.query(TrafficMetric)
        .filter(TrafficMetric.road_id == road)
        .order_by(TrafficMetric.timestamp.desc())
        .first()
    )
    if not row:
        return {"answer": f"No live traffic metrics are available yet for {road}.", "evidence": {}}

    baseline = row.baseline_speed or ROAD_BASELINE_SPEED.get(road, 35)
    speed_drop_pct = round(max(0, (baseline - row.avg_speed) / max(1, baseline)) * 100, 1)
    text = (
        f"{road} is currently experiencing a {speed_drop_pct}% reduction in average speed "
        f"compared with its baseline.\n\n"
        f"Current average speed: {row.avg_speed:.0f} km/h\n"
        f"Baseline average speed: {baseline:.0f} km/h\n"
        f"Vehicle count: {row.vehicle_count}\n"
        f"Congestion index: {round(row.congestion_index * 100)}%"
    )
    return {
        "answer": text,
        "evidence": {
            "road": road,
            "avg_speed": row.avg_speed,
            "baseline_speed": baseline,
            "vehicle_count": row.vehicle_count,
            "congestion_index": row.congestion_index,
        },
    }


def _busiest_corridors(db: Session) -> dict:
    rows = latest_road_snapshot(db)
    rows.sort(key=lambda r: -r["vehicle_count"])
    top = rows[:5]
    lines = [f"{i+1}. {r['road_id']} — {r['vehicle_count']} vehicles, {r['avg_speed']:.0f} km/h avg"
             for i, r in enumerate(top)]
    return {
        "answer": "Busiest corridors right now:\n\n" + "\n".join(lines),
        "evidence": {"top_roads": top},
    }


def _abnormal_speed_roads(db: Session) -> dict:
    rows = latest_road_snapshot(db)
    flagged = [r for r in rows if r["baseline_speed"] and (r["baseline_speed"] - r["avg_speed"]) / r["baseline_speed"] > 0.25]
    if not flagged:
        return {"answer": "No roads currently show an abnormal speed reduction beyond the 25% threshold.", "evidence": {}}
    lines = [f"{r['road_id']}: {r['avg_speed']:.0f} km/h (baseline {r['baseline_speed']:.0f} km/h)" for r in flagged]
    return {"answer": "Roads with abnormal speed reductions:\n\n" + "\n".join(lines), "evidence": {"roads": flagged}}


def _trajectory_summary(db: Session, plate: str) -> dict:
    from app.models.models import Trajectory
    traj = (
        db.query(Trajectory)
        .filter(Trajectory.vehicle_identity == plate)
        .order_by(Trajectory.confidence.desc())
        .first()
    )
    if not traj:
        return {"answer": f"No reconstructed trajectory found for {plate} in the current demo window.", "evidence": {}}
    cams = [p.camera_id for p in traj.points]
    text = (
        f"Reconstructed trajectory for {plate}:\n\n"
        f"Route: {' → '.join(cams)}\n"
        f"Distance: {traj.distance_km:.1f} km\n"
        f"Avg speed: {traj.avg_speed:.0f} km/h\n"
        f"Confidence: {round(traj.confidence * 100)}%"
    )
    return {"answer": text, "evidence": {"plate": plate, "cameras": cams, "confidence": traj.confidence}}


def _predict_congestion(db: Session) -> dict:
    from app.analytics.engine import road_forecast
    rows = latest_road_snapshot(db)
    forecasts = sorted([road_forecast(r) for r in rows], key=lambda f: -f["risk"])[:3]
    lines = [f"{f['road']}: {round(f['risk']*100)}% risk, expected in ~{f['prediction_minutes']} min" for f in forecasts]
    return {"answer": "Highest congestion risk in the next window:\n\n" + "\n".join(lines), "evidence": {"forecasts": forecasts}}


def _degraded_cameras(db: Session) -> dict:
    issues = camera_health_check(db)
    if not issues:
        return {"answer": "All cameras are currently within normal OCR confidence range.", "evidence": {}}
    lines = [f"{i['camera_id']} ({i['name']}): {i['current_ocr_confidence']*100:.1f}% "
             f"(baseline {i['baseline_ocr_confidence']*100:.1f}%) — {i['note']}" for i in issues]
    return {"answer": "Cameras with degraded OCR performance:\n\n" + "\n".join(lines), "evidence": {"issues": issues}}


def _general_status(db: Session) -> dict:
    total_cams = db.query(Camera).count()
    online = db.query(Camera).filter(Camera.status == "ONLINE").count()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["NEW", "ACKNOWLEDGED", "INVESTIGATING"])).count()
    rows = latest_road_snapshot(db)
    avg_speed = round(sum(r["avg_speed"] for r in rows) / len(rows), 1) if rows else 0
    text = (
        f"City status: {online}/{total_cams} cameras online, {active_alerts} active alerts, "
        f"average city-wide speed {avg_speed} km/h.\n\n"
        f"Try asking about a specific road (e.g. \"Why is Central Corridor congested?\") "
        f"or a specific plate (e.g. \"Show the trajectory of MH12AB1234\")."
    )
    return {"answer": text, "evidence": {"cameras_online": online, "total_cameras": total_cams, "active_alerts": active_alerts}}
