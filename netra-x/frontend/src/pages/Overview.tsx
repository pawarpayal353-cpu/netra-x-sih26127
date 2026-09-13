import { useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, KpiCard, Spinner, ConnectionLost } from "../components/ui";
import { CityMap } from "../components/CityMap";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import { useApp } from "../lib/AppContext";
import { Camera as CameraIcon, Gauge, AlertTriangle, LineChart as LineChartIcon, ScanLine, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Camera as CameraType } from "../types";

export default function Overview() {
  const { data: dashboard, error, loading, reload } = useFetch(() => api.dashboard(), [], 8000);
  const { data: cameras } = useFetch(() => api.cameras(), [], 15000);
  const { data: roads } = useFetch(() => api.trafficLive(), [], 10000);
  const { liveEvents, maskPlate } = useApp();

  const [mapFilter, setMapFilter] = useState<"traffic" | "cameras" | "congestion">("cameras");

  const pulseCameraIds = useMemo(() => liveEvents.slice(0, 8).map((e) => e.observation.camera_id), [liveEvents]);

  const flowData = useMemo(() => {
    if (!roads) return [];
    return roads.map((r) => ({ name: r.road_id.split(" ")[0], speed: r.avg_speed, count: r.vehicle_count }));
  }, [roads]);

  return (
    <div>
      <TopBar title="NETRA-X" subtitle="CITY MOBILITY INTELLIGENCE" />
      <div className="p-5 lg:p-8 space-y-6">
        {error && <ConnectionLost onRetry={reload} />}
        {!error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard label="CAMERAS ONLINE" value={dashboard ? `${dashboard.cameras_online}/${dashboard.cameras_total}` : "—"} icon={<CameraIcon size={14} />} />
              <KpiCard label="VEHICLES / MIN" value={dashboard?.vehicles_per_min ?? "—"} icon={<Activity size={14} />} />
              <KpiCard label="ACTIVE ALERTS" value={dashboard ? String(dashboard.active_alerts).padStart(2, "0") : "—"} accent="danger" icon={<AlertTriangle size={14} />} />
              <KpiCard label="CONGESTION ZONES" value={dashboard ? String(dashboard.congestion_zones).padStart(2, "0") : "—"} accent="warning" icon={<LineChartIcon size={14} />} />
              <KpiCard label="AVG CITY SPEED" value={dashboard?.avg_city_speed ?? "—"} suffix="km/h" icon={<Gauge size={14} />} />
              <KpiCard label="ANPR CONFIDENCE" value={dashboard?.anpr_confidence ?? "—"} suffix="%" accent="success" icon={<ScanLine size={14} />} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 space-y-5">
                <Panel
                  title="LIVE CITY MAP"
                  actions={
                    <div className="flex gap-1.5 text-[11px]">
                      {(["cameras", "traffic", "congestion"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setMapFilter(f)}
                          className={`px-2.5 py-1 rounded-md border capitalize ${mapFilter === f ? "bg-primary/15 text-primary border-primary/30" : "text-muted border-border"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  }
                >
                  {cameras ? (
                    <CityMap cameras={cameras} pulseCameraIds={pulseCameraIds} height={420} />
                  ) : (
                    <Spinner label="Loading map…" />
                  )}
                </Panel>

                <Panel title="TRAFFIC FLOW — CURRENT SPEED BY ROAD">
                  {flowData.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={flowData}>
                        <CartesianGrid stroke="#101A2C" vertical={false} />
                        <XAxis dataKey="name" stroke="#7E8CA3" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#7E8CA3" fontSize={11} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: "#0C1320", border: "1px solid #1B2740", borderRadius: 10, fontSize: 12 }} />
                        <Line type="monotone" dataKey="speed" stroke="#00E5FF" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Spinner label="Loading traffic flow…" />
                  )}
                </Panel>
              </div>

              <Panel title="LIVE EVENTS" className="max-h-[680px] flex flex-col">
                <div className="space-y-1 overflow-y-auto -mx-2 px-2" style={{ maxHeight: 600 }}>
                  {liveEvents.length === 0 && <p className="text-xs text-muted py-6 text-center">Waiting for live events…</p>}
                  {liveEvents.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div>
                        <div className="font-mono text-sm text-ink">{maskPlate(e.observation.plate)}</div>
                        <div className="text-[11px] text-muted">
                          {new Date(e.observation.timestamp).toLocaleTimeString()} · Camera {e.observation.camera_id}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-success">
                        OCR {Math.round(e.observation.ocr_confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}
        {loading && !dashboard && !error && <Spinner label="Loading dashboard…" />}
      </div>
    </div>
  );
}
