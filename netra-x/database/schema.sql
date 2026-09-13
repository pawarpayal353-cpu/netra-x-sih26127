-- NETRA-X reference schema (PostgreSQL + PostGIS-compatible).
-- Note: the FastAPI backend creates these tables automatically via SQLAlchemy
-- on startup (see backend/app/models/models.py) for both SQLite and Postgres.
-- This file is provided for direct psql use, migrations tooling, or reference.

-- Uncomment if PostGIS is installed and you want native geometry columns:
-- CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS cameras (
    camera_id             VARCHAR PRIMARY KEY,
    name                  VARCHAR NOT NULL,
    road_id               VARCHAR NOT NULL,
    latitude              DOUBLE PRECISION NOT NULL,
    longitude             DOUBLE PRECISION NOT NULL,
    direction             VARCHAR NOT NULL,
    status                VARCHAR DEFAULT 'ONLINE',
    fps                   INTEGER DEFAULT 30,
    latency_ms            INTEGER DEFAULT 80,
    ocr_confidence        DOUBLE PRECISION DEFAULT 0.95,
    baseline_ocr_confidence DOUBLE PRECISION DEFAULT 0.95,
    vehicles_per_min      INTEGER DEFAULT 30
    -- geom GEOGRAPHY(Point, 4326)  -- optional PostGIS column
);

CREATE TABLE IF NOT EXISTS vehicle_observations (
    observation_id  SERIAL PRIMARY KEY,
    camera_id       VARCHAR REFERENCES cameras(camera_id),
    plate_text      VARCHAR,
    plate_hash      VARCHAR,
    timestamp       TIMESTAMPTZ DEFAULT now(),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    direction       VARCHAR,
    vehicle_type    VARCHAR,
    ocr_confidence  DOUBLE PRECISION,
    image_quality   DOUBLE PRECISION,
    speed_kmh       DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_obs_plate ON vehicle_observations(plate_text);
CREATE INDEX IF NOT EXISTS idx_obs_hash ON vehicle_observations(plate_hash);

CREATE TABLE IF NOT EXISTS trajectories (
    trajectory_id    SERIAL PRIMARY KEY,
    vehicle_identity VARCHAR,
    start_time       TIMESTAMPTZ,
    end_time         TIMESTAMPTZ,
    distance_km      DOUBLE PRECISION,
    avg_speed        DOUBLE PRECISION,
    confidence       DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_traj_vehicle ON trajectories(vehicle_identity);

CREATE TABLE IF NOT EXISTS trajectory_points (
    id               SERIAL PRIMARY KEY,
    trajectory_id    INTEGER REFERENCES trajectories(trajectory_id),
    camera_id        VARCHAR REFERENCES cameras(camera_id),
    timestamp        TIMESTAMPTZ,
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,
    sequence_number  INTEGER,
    confidence       DOUBLE PRECISION,
    speed_kmh        DOUBLE PRECISION,
    road_id          VARCHAR
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id          SERIAL PRIMARY KEY,
    type              VARCHAR,
    severity          VARCHAR,
    vehicle_identity  VARCHAR,
    camera_id         VARCHAR REFERENCES cameras(camera_id),
    timestamp         TIMESTAMPTZ DEFAULT now(),
    reason            TEXT,
    confidence        DOUBLE PRECISION,
    status            VARCHAR DEFAULT 'NEW',
    details_json      TEXT
);

CREATE TABLE IF NOT EXISTS traffic_metrics (
    id                 SERIAL PRIMARY KEY,
    road_id            VARCHAR,
    timestamp          TIMESTAMPTZ DEFAULT now(),
    vehicle_count      INTEGER,
    avg_speed          DOUBLE PRECISION,
    density            DOUBLE PRECISION,
    congestion_index   DOUBLE PRECISION,
    baseline_speed     DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_metrics_road ON traffic_metrics(road_id);
