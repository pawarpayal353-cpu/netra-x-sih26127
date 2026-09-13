# NETRA-X API Reference

Base URL (local dev): `http://localhost:8000`

All endpoints below are prefixed with `/api` except `/health`.

## Health

`GET /health` -> `{ "status": "healthy" }`

## Dashboard

`GET /api/dashboard` — top-level KPIs for the Overview screen.

## Cameras

- `GET /api/cameras` — list all cameras
- `GET /api/cameras/{camera_id}` — camera detail + recent observations
- `GET /api/cameras/{camera_id}/health` — OCR drop / degradation check

## ANPR

- `POST /api/anpr/process` — run the mock ANPR engine on a (simulated) frame.
  Body: `{ "plate_hint": "MH12AB1234" }` (optional)

## Vehicles

- `GET /api/vehicles/search?plate=MH12AB1234`
- `GET /api/vehicles/{plate}/trajectory` — reconstructed route + per-transition scoring
- `GET /api/vehicles/{plate}/missing-camera?cam_from=C10&cam_to=C18` — inferred intermediate cameras

## Traffic

- `GET /api/traffic/live` — latest metrics per road
- `GET /api/traffic/heatmap` — per-camera congestion intensity for map overlays
- `GET /api/traffic/od` — origin-destination matrix
- `GET /api/traffic/bottlenecks` — roads sorted by congestion index
- `GET /api/traffic/forecast` — congestion risk + predicted onset per road

## City Mobility Graph

`GET /api/graph` — nodes, edges, and graph statistics

## Alerts

- `GET /api/alerts?category=ROUTE_ANOMALY` — category is optional; one of
  `ALL`, `HIGH PRIORITY`, `ROUTE_ANOMALY`, `WATCHLIST`, `CONGESTION`, `CAMERA_HEALTH`
- `POST /api/alerts/{alert_id}/acknowledge` — body: `{ "status": "ACKNOWLEDGED" }`
  (`ACKNOWLEDGED` | `INVESTIGATING` | `DISMISSED`)

## AI Traffic Analyst

`POST /api/ai/query` — body: `{ "query": "Why is Central Corridor congested?" }`
Returns `{ "answer": string, "evidence": object }`. Answers are generated
from live database state, not an external model.

## Reports

`GET /api/reports/{report_type}` where `report_type` is one of:
`daily-traffic`, `vehicle-trajectory`, `congestion`, `camera-health`, `alerts`.

## System

- `GET /api/system/health` — service status + live metrics
- `POST /api/system/simulation` — body: `{ "on": true }`
- `POST /api/system/reset-demo` — drops and reseeds all demo data

## WebSocket

`ws://localhost:8000/api/ws/live` — pushes `{"kind": "live_event", "observation": {...}, "alert": {...} | null}`
roughly every 3 seconds while the simulation is on.
