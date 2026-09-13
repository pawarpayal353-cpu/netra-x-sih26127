from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class Camera(Base):
    __tablename__ = "cameras"

    camera_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    road_id = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    direction = Column(String, nullable=False)
    status = Column(String, default="ONLINE")  # ONLINE / DEGRADED / OFFLINE
    fps = Column(Integer, default=30)
    latency_ms = Column(Integer, default=80)
    ocr_confidence = Column(Float, default=0.95)
    vehicles_per_min = Column(Integer, default=30)
    baseline_ocr_confidence = Column(Float, default=0.95)


class VehicleObservation(Base):
    __tablename__ = "vehicle_observations"

    observation_id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String, ForeignKey("cameras.camera_id"))
    plate_text = Column(String, index=True)
    plate_hash = Column(String, index=True)
    timestamp = Column(DateTime, default=now_utc)
    latitude = Column(Float)
    longitude = Column(Float)
    direction = Column(String)
    vehicle_type = Column(String)
    ocr_confidence = Column(Float)
    image_quality = Column(Float)
    speed_kmh = Column(Float)


class Trajectory(Base):
    __tablename__ = "trajectories"

    trajectory_id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_identity = Column(String, index=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    distance_km = Column(Float)
    avg_speed = Column(Float)
    confidence = Column(Float)

    points = relationship("TrajectoryPoint", back_populates="trajectory", order_by="TrajectoryPoint.sequence_number")


class TrajectoryPoint(Base):
    __tablename__ = "trajectory_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trajectory_id = Column(Integer, ForeignKey("trajectories.trajectory_id"))
    camera_id = Column(String, ForeignKey("cameras.camera_id"))
    timestamp = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    sequence_number = Column(Integer)
    confidence = Column(Float)
    speed_kmh = Column(Float)
    road_id = Column(String)

    trajectory = relationship("Trajectory", back_populates="points")


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String)  # ROUTE_ANOMALY / WATCHLIST / CONGESTION / CAMERA_HEALTH
    severity = Column(String)  # HIGH / MEDIUM / LOW
    vehicle_identity = Column(String, nullable=True)
    camera_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=now_utc)
    reason = Column(Text)
    confidence = Column(Float)
    status = Column(String, default="NEW")  # NEW / ACKNOWLEDGED / INVESTIGATING / DISMISSED
    details_json = Column(Text, nullable=True)


class TrafficMetric(Base):
    __tablename__ = "traffic_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    road_id = Column(String, index=True)
    timestamp = Column(DateTime, default=now_utc)
    vehicle_count = Column(Integer)
    avg_speed = Column(Float)
    density = Column(Float)
    congestion_index = Column(Float)
    baseline_speed = Column(Float)
