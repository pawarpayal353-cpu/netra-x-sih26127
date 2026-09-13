# NETRA-X Demo Walkthrough (SIH Judge Path)

## 30-second read

On **Overview**, judges immediately see:
`42 cameras`, `vehicles/min`, `active alerts`, `congestion zones`, `avg city speed`, `ANPR confidence`
— then the live map and event stream pulsing with simulated traffic.

## Suggested walkthrough (5–7 minutes)

1. **Overview** — narrate the KPI row, point at the live map (camera nodes
   colored by health), and the Live Events panel updating every ~3 seconds.
2. **Vehicle Intelligence** — search `MH12AB1234` (or any of the other demo
   plates below). Show OCR confidence, observation count, camera sequence.
3. **Trajectory Explorer** — click "View Trajectory" from the search result
   (or load the plate directly here). Click **Replay Journey** — the vehicle
   marker animates along the route on the map while the timeline advances.
   Click any timeline point to show that camera's speed/OCR/confidence detail.
4. **Traffic Analytics** — show the OD matrix and the congestion-index donut.
5. **City Mobility Graph** — explain "every camera is a node, every road
   transition is an edge"; click a node to show incoming/outgoing flow.
6. **Alerts** — open a Route Anomaly alert, point out the
   "flagged for authorized human review" wording (the system never asserts
   criminal intent), then Acknowledge it.
7. **AI Traffic Analyst** — ask "Why is Central Corridor congested?" and
   "Predict congestion for the next 30 minutes" — responses are generated
   from the same live database, not a canned script.
8. **System Health** — all five services green, with live metrics.

## Demo vehicle plates

```
MH12AB1234
MH14CD5678
KA01EF9012
DL01GH3456
MH11JK7890
GJ05LM1234
```

These are synthetic identities seeded alongside ~124 other randomly
generated plates — none correspond to real vehicles.

## Resetting the demo

**Settings -> Demo Mode -> Reset Demo** (or `POST /api/system/reset-demo`)
drops and reseeds all tables with a fresh synthetic city state.
