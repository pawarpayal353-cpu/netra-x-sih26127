import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, Spinner, StatusBadge, ConnectionLost } from "../components/ui";
import { CityMap } from "../components/CityMap";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import { useApp } from "../lib/AppContext";
import type { Camera } from "../types";

export default function CommandCenter() {
  const { data: cameras, error, reload } = useFetch(() => api.cameras(), [], 12000);
  const { liveEvents, maskPlate } = useApp();
  const [selected, setSelected] = useState<Camera | null>(null);

  if (error) return (
    <div>
      <TopBar title="Live Command Center" />
      <div className="p-8"><ConnectionLost onRetry={reload} /></div>
    </div>
  );

  return (
    <div>
      <TopBar title="Live Command Center" subtitle="Full-screen operational view" />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 p-5 lg:p-6 h-[calc(100vh-73px)] min-h-[600px]">
        <Panel title="CAMERAS" className="overflow-hidden flex flex-col">
          <div className="overflow-y-auto -mx-2 px-2 space-y-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {!cameras && <Spinner />}
            {cameras?.map((c) => (
              <button
                key={c.camera_id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between border ${
                  selected?.camera_id === c.camera_id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-white/5"
                }`}
              >
                <span className="font-mono">{c.camera_id}</span>
                <StatusBadge status={c.status} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="LIVE MAP" className="min-h-[400px]">
          {cameras && (
            <CityMap
              cameras={cameras}
              activeCameraId={selected?.camera_id}
              pulseCameraIds={liveEvents.slice(0, 6).map((e) => e.observation.camera_id)}
              onCameraClick={setSelected}
              height={window.innerWidth < 1024 ? 340 : 560}
            />
          )}
        </Panel>

        <Panel title="EVENT STREAM" className="overflow-hidden">
          <div className="overflow-y-auto -mx-2 px-2 space-y-1" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {liveEvents.map((e, i) => (
              <div key={i} className="py-2 border-b border-border/40 last:border-0 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-ink">{maskPlate(e.observation.plate)}</span>
                  <span className="text-success">{Math.round(e.observation.ocr_confidence * 100)}%</span>
                </div>
                <div className="text-muted mt-0.5">
                  {e.observation.camera_id} · {e.observation.vehicle_type} · {new Date(e.observation.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm h-full glass border-l border-border/60 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selected.camera_id}</h3>
            <p className="text-sm text-muted mb-4">{selected.name}</p>
            <div className="space-y-3 text-sm">
              <Row label="Status" value={<StatusBadge status={selected.status} />} />
              <Row label="FPS" value={`${selected.fps}`} />
              <Row label="Latency" value={`${selected.latency_ms} ms`} />
              <Row label="OCR Confidence" value={`${(selected.ocr_confidence * 100).toFixed(1)}%`} />
              <Row label="Vehicles / min" value={`${selected.vehicles_per_min}`} />
              <Row label="Road" value={selected.road_id} />
              <Row label="Direction" value={selected.direction} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
