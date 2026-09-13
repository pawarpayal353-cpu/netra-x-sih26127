# NETRA-X

**AI-Powered City-Wide Multi-Camera ANPR Trajectory Tracking & Urban Traffic Intelligence Platform**

Built for **SIH26127** — City-Wide AI Engine for Multi-Camera ANPR Trajectory
Tracking and Urban Traffic Analytics (Bharat Electronics Limited).

> ⚠️ **Read this before demoing:** this project ships with **zero external
> dependencies** — no API keys, no real CCTV feeds, no paid services. Every
> camera, vehicle, trajectory, and alert is synthetic demo data generated on
> startup. See "Known limitations" at the bottom for exactly what is real
> logic vs. simplified for the demo.

---

## 1. Project overview

NETRA-X reconstructs city-wide vehicle journeys from multi-camera ANPR
observations. Instead of a simple per-camera plate lookup, it builds a
**City Mobility Graph** (cameras as nodes, road transitions as edges),
fuses multi-frame OCR readings into a single confident plate read, scores
camera-to-camera transitions on six signals, and reconstructs the most
probable trajectory — while clearly labeling anything inferred (missing
cameras) as unconfirmed.

## 2. Features

- Multi-frame OCR confidence fusion (mocked ANPR engine, real fusion math)
- City Mobility Graph: 42 cameras, 10 roads, cross-linked graph
- Trajectory reconstruction with explainable per-transition scoring
- Missing-camera inference (labeled as inferred, never confirmed)
- Traffic analytics: density, speed, OD matrix, bottlenecks, forecasting
- Explainable route-anomaly alerts ("flagged for authorized human review" —
  never asserts criminal intent)
- Camera health monitoring (OCR confidence drop detection)
- Local, data-grounded AI Traffic Analyst (no external LLM call)
- Real-time simulation over WebSocket with on/off toggle
- Privacy Mode (plate masking) + RBAC role switcher + audit log (UI-level)
- Dark tactical command-center UI, responsive down to mobile
- Offline-safe SVG city map (no external map tile dependency to fail)

## 3. Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full pipeline
diagram and design rationale. Short version:

```
frontend/   React + TypeScript + Vite + Tailwind + Recharts + SVG city map
backend/    FastAPI + SQLAlchemy + SQLite (default) / PostgreSQL (production)
database/   Reference schema.sql + seed.sql (demo data is generated in Python)
```

## 4. Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- (Optional) Docker + Docker Compose

### Windows setup
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
```powershell
cd frontend
npm install
npm run dev
```

### macOS / Linux setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
```bash
cd frontend
npm install
npm run dev
```

### VS Code setup
1. Open the `netra-x/` folder as a workspace.
2. Install the Python and ESLint/Prettier extensions if prompted.
3. Open two integrated terminals — one for `backend/`, one for `frontend/`
   — and run the commands above in each.
4. Backend: http://localhost:8000/docs (interactive Swagger UI)
   Frontend: http://localhost:5173

### Docker setup
```bash
docker compose up --build
```
This starts `backend` (port 8000), `frontend` (port 5173), `postgres`
(port 5432), and `redis` (port 6379). The backend switches from SQLite to
the Postgres container automatically via the `DATABASE_URL` environment
variable set in `docker-compose.yml`.

### One-command start (non-Docker)
```bash
# terminal 1
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
# terminal 2
cd frontend && npm install && npm run dev
```

## 5. Local development

- Backend auto-reseeds demo data on first run if the database is empty
  (`ensure_seeded()` in `app/main.py`'s lifespan hook).
- Force a full reseed at any time: `POST /api/system/reset-demo`, or the
  **Reset Demo** button under Settings, or:
  ```bash
  cd backend && python -m app.services.seed_cli
  ```
- The live simulation writes a new observation roughly every 3 seconds and
  broadcasts it over `/ws/live`. Toggle it from Settings or
  `POST /api/system/simulation`.

## 6. Demo credentials

None required — the app has no login wall. RBAC role switching (Admin /
Operator / Analyst / Auditor) is available under **Settings** as a demo of
the intended access-control structure; it's currently UI-scoped and not
yet enforced server-side (see limitations).

## 7. API documentation

See [`docs/api.md`](docs/api.md). Interactive Swagger docs are also
available at `http://localhost:8000/docs` once the backend is running.

## 8. AI architecture

See the "AI Traffic Analyst" section of [`docs/architecture.md`](docs/architecture.md).
In short: no external LLM call. `app/ai/analyst.py` extracts intent/entities
from the question with light regex/keyword matching, queries the real
database, and renders an explanation template from the results.

## 9. Dataset strategy

All data is synthetic, generated deterministically-enough to be internally
consistent (a trajectory's distance always matches its constituent points,
confidence scores are drawn from realistic ranges, etc.) but randomized
per-process so each fresh seed looks slightly different. No personal data,
no real camera feeds, no real license plates are used or required.

## 10. Production deployment

To move toward production:
1. Set `DATABASE_URL` to a real PostgreSQL/PostGIS instance.
2. Replace `MockANPREngine` in `app/services/anpr_engine.py` with a real
   implementation behind the same `ANPREngine.process_frame()` interface
   (YOLO vehicle detector → plate detector → PaddleOCR → this fusion code
   is already structured to accept it unchanged).
3. Replace the `simulation_loop` background task with a real RTSP/camera
   ingestion service that calls the same `VehicleObservation` write path.
4. Add authentication and enforce the RBAC roles server-side (currently
   demo/UI-only).
5. Put the API behind a reverse proxy (nginx/Traefik) with TLS and add
   rate limiting (the CORS + error-handling middleware is already in place
   as a foundation).

## 11. Privacy / security

- **Privacy Mode** (Settings) masks plates everywhere in the UI:
  `MH12AB1234` → `MH12••••34`.
- Plates are also hashed (`plate_hash`) alongside the plaintext for
  future use cases that only need equality checks.
- No secrets are hardcoded; all configuration is via `.env` (see
  `backend/.env.example`, `frontend/.env.example`).
- CORS is explicitly configured via `ALLOWED_ORIGINS`.
- Alerts always use human-review language, never accusatory language.
- RBAC roles and an audit log are present in the UI as an architectural
  placeholder for the access-control model a production deployment needs;
  they are not yet enforced by the API.

## 12. Deploying the frontend to Netlify

Netlify only hosts the static frontend — it cannot run the Python backend.
Two things are required:

1. **SPA routing.** A static host has no idea `/alerts` or
   `/trajectory-explorer` are real pages — they only exist client-side via
   React Router. Without a rewrite rule, Netlify 404s on every route except
   `/`. This is already fixed in this repo via `frontend/public/_redirects`
   and `netlify.toml` (both rewrite all paths to `index.html` with a 200,
   so React Router can take over). If you're connecting this repo in the
   Netlify UI:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist` (or `dist` if base is already `frontend`)
2. **Backend URL.** The frontend still needs a real backend to talk to —
   deploy `backend/` somewhere that can run a long-lived Python process
   (Render, Railway, Fly.io, a VM, etc. — not Netlify). Then in Netlify's
   site settings, set the environment variable `VITE_API_BASE` to that
   backend's public URL (e.g. `https://netra-x-api.onrender.com`) **before**
   triggering a build — Vite inlines `VITE_*` variables at build time, so
   changing it requires a redeploy, not just a page refresh. Without this,
   the deployed site will load but every screen will show "Connection lost"
   because it's still pointed at `http://localhost:8000`.

### Deploying the backend to Render (concrete steps)

This repo includes a `render.yaml` Blueprint, so this is largely one-click:

1. Push this repo to GitHub/GitLab.
2. In Render: **New -> Blueprint**, point it at the repo. Render reads
   `render.yaml` and provisions a free web service using
   `backend/Dockerfile`.
3. Before or after the first deploy, set the `ALLOWED_ORIGINS` env var on
   that Render service to your actual Netlify URL(s), comma-separated
   (e.g. `https://5127f7.netlify.app`) — the placeholder in `render.yaml`
   won't match your site. CORS will reject the frontend's requests
   otherwise (you'd see errors in the browser console, not "Connection
   lost").
4. Once it's live, open `https://<your-service>.onrender.com/health` and
   confirm it returns `{"status": "healthy"}`.
5. Copy that base URL (no trailing `/health`) into Netlify's
   `VITE_API_BASE` env var and trigger a Netlify redeploy.
6. Note: the free Render tier (a) spins the service down after inactivity,
   so the first request after idle can take ~30–60s to wake it up, and
   (b) uses ephemeral disk, so the SQLite demo data resets on every
   redeploy/restart — both are fine for a demo, not for anything you need
   to persist.

If you deploy the backend anywhere else (Railway, Fly.io, a VM), the same
two things matter regardless of host: it must bind to `0.0.0.0:$PORT`
(already handled in `backend/Dockerfile`), and `ALLOWED_ORIGINS` must
include your real frontend URL.

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| Netlify shows its own "Page not found" 404 on any route but `/` | Missing SPA redirect rule — see section 12. Already fixed here via `_redirects` / `netlify.toml`; if you still see it, double check the publish directory actually contains `_redirects` after build (`frontend/dist/_redirects`). |
| Netlify deploy succeeds but every screen shows "Connection lost" | `VITE_API_BASE` isn't set to your deployed backend's URL — see section 12. |
| Frontend loads, requests fail with a CORS error in the browser console (not "Connection lost") | Backend's `ALLOWED_ORIGINS` doesn't include your Netlify URL — update it on your backend host and restart. |
| Render backend takes ~30–60s to respond on first load | Expected on the free tier — it spins down when idle. Not an error. |
| Frontend shows "Connection lost" | Backend isn't running, or `VITE_API_BASE` doesn't match where it's running. Check `http://localhost:8000/health`. |
| WebSocket badge stuck on "CONNECTING" | Same as above — the socket URL is derived from `VITE_API_BASE`. |
| `pip install` fails on `psycopg2-binary` | Only needed for Postgres; if you're using the SQLite default you can remove that line from `requirements.txt`. |
| Docker Compose backend can't reach Postgres | Wait a few seconds — the backend depends on Postgres's healthcheck, but the first boot can still race. Re-run `docker compose up`. |
| Map looks empty | Cameras haven't loaded yet — check the Network tab for `/api/cameras`; if the backend just started, seeding takes a moment. |

## 14. Testing

```bash
cd backend && pytest
cd frontend && npm run test
```

## 15. Known limitations

- **This build was authored and syntax-verified in a sandboxed environment
  with no network access** — `pip install` and `npm install` could not be
  run here, so the backend/frontend could not be booted or exercised
  end-to-end in this environment. All Python files were verified with
  `python -m py_compile` (clean). The code follows standard, well-worn
  FastAPI/SQLAlchemy and React/Vite/Tailwind patterns throughout, but you
  should run the install + test commands above yourself before a live
  demo, with enough lead time to fix anything that surfaces.
- ANPR, vehicle detection, and OCR are fully mocked (by design, per the
  brief) — `MockANPREngine` produces plausible results, not real computer
  vision output.
- RBAC roles are UI-only; not enforced server-side yet.
- The origin-destination matrix is deterministically synthesized per road
  pair rather than derived from full trajectory joins (noted in code
  comments in `app/analytics/engine.py`).
- Map is a stylized offline SVG projection (by design, so the app never
  breaks on a tile-provider outage), not a georeferenced basemap.
- No authentication layer — anyone who can reach the API can call it.

## 16. Project structure

```
netra-x/
├── frontend/           React + TS + Vite + Tailwind
├── backend/
│   └── app/
│       ├── api/         REST + WebSocket routes
│       ├── models/      SQLAlchemy models
│       ├── services/    ANPR engine, city topology, seeding
│       ├── ai/          Local AI Traffic Analyst
│       ├── trajectory/  Scoring + reconstruction
│       ├── analytics/   Density, speed, OD, forecasting, anomaly
│       └── simulation/  WebSocket manager + live event loop
├── database/            Reference schema.sql / seed.sql notes
├── docs/                architecture.md, api.md, demo.md
├── docker-compose.yml
└── .env.example files (frontend/ and backend/)
```
