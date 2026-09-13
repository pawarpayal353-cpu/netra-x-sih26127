# NETRA-X Architecture

## Pipeline

```
CAMERAS
  -> VEHICLE DETECTION            (interface: app/services/anpr_engine.py)
  -> LICENSE PLATE DETECTION      (mocked inside MockANPREngine)
  -> OCR                          (mocked inside MockANPREngine)
  -> MULTI-FRAME CONFIDENCE FUSION(fuse_ocr_readings)
  -> VEHICLE OBSERVATION          (VehicleObservation model)
  -> CITY MOBILITY GRAPH          (app/services/city_topology.py)
  -> TRAJECTORY RECONSTRUCTION    (app/trajectory/matcher.py)
  -> TRAFFIC ANALYTICS            (app/analytics/engine.py)
  -> ANOMALY DETECTION            (detect_route_anomaly)
  -> CONGESTION PREDICTION        (road_forecast)
  -> EXPLAINABLE ALERTS           (Alert model + reason text)
  -> GENAI TRAFFIC ANALYST        (app/ai/analyst.py)
```

## Why a mock ANPR engine

`ANPREngine` is an abstract base class with one method: `process_frame(frame)`.
`MockANPREngine` implements it without any model weights, producing realistic
plate/confidence/vehicle-type triples. A production deployment swaps in a
real implementation (YOLO vehicle detector -> plate detector -> PaddleOCR)
behind the same interface — no caller changes.

## City Mobility Graph

`app/services/city_topology.py` builds a deterministic 42-camera graph across
10 named roads (Airport Road, Ring Road, Central Corridor, Station Road,
Industrial Area, University Road, Market Road, East Bypass, West Bypass,
CBD). Cameras along a road form a chain; the innermost camera of each road is
cross-linked to the others, so cross-road trajectories are graph-reachable,
not just per-road chains. This graph is the single source of truth used by:

- the seeder (to generate plausible multi-camera vehicle journeys)
- the trajectory matcher (`edge_exists`, `infer_missing_camera`)
- the frontend's SVG city map (roads + camera nodes)

## Trajectory scoring

`score_transition()` combines six signals into one composite score:
OCR similarity, temporal consistency (is the implied speed plausible),
geographic consistency (is there a graph edge between the two cameras),
direction consistency, vehicle-type similarity, and camera-graph
consistency. Each sub-score is returned alongside the composite so the UI
can show *why* two observations were linked (see the Trajectory Explorer's
per-point detail panel).

## Missing-camera inference

When two matched observations are not graph-adjacent, `infer_missing_camera()`
proposes probable intermediate cameras using shared-neighbor structure in the
graph, with a probability split across candidates. Every result is tagged
`"inferred": true` and the API/UI never present these as confirmed
observations.

## AI Traffic Analyst

`app/ai/analyst.py` is **not** a call to a hosted LLM. It parses the query
for a road name, plate, or intent keyword, pulls the matching rows from the
real database (traffic metrics, alerts, trajectories, camera health), and
renders a templated explanation from that data. Swapping in a real LLM later
only touches the prose-rendering step — the data-gathering functions
(`_explain_congestion`, `_trajectory_summary`, etc.) stay the same and can be
handed to an LLM as tool results.

## Real-time layer

A single asyncio background task (`simulation_loop`) ticks every 3 seconds,
picks a random online camera, generates a plausible observation (occasionally
a demo plate), writes it to the database, and broadcasts it over
`/ws/live` to all connected clients. ~5% of ticks also generate an alert.
The `/api/system/simulation` endpoint toggles this on/off; the frontend
reflects connection state (connecting / connected / offline) and
auto-reconnects with backoff.

## Swapping SQLite for PostgreSQL/PostGIS

Nothing in application code is SQLite-specific. Set `DATABASE_URL` in `.env`
to a `postgresql+psycopg2://...` URL and restart — SQLAlchemy creates the
same tables. `database/schema.sql` is provided as a plain-SQL reference for
teams that prefer to manage schema via migrations instead of
`Base.metadata.create_all`.
