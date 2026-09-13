import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Panel, Spinner, EmptyState, ConnectionLost } from "../components/ui";
import { CityMap } from "../components/CityMap";
import { useFetch } from "../hooks/useFetch";
import { api, ApiError } from "../lib/api";
import { useApp } from "../lib/AppContext";
import type { TrajectoryData, Camera, TrajectoryPoint } from "../types";
import { Play, Pause, RotateCcw, Download, Search } from "lucide-react";

export default function TrajectoryExplorer() {
  const [params] = useSearchParams();
  const [plateInput, setPlateInput] = useState(params.get("plate") || "MH12AB1234");
  const [plate, setPlate] = useState(params.get("plate") || "MH12AB1234");
  const { data: cameras } = useFetch(() => api.cameras(), []);
  const { data: traj, error, loading, reload } = useFetch(() => api.trajectory(plate), [plate]);
  const { maskPlate } = useApp();

  const [selectedPoint, setSelectedPoint] = useState<TrajectoryPoint | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedPoint(null);
    setProgress(0);
    setPlaying(false);
  }, [traj]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    let last = performance.now();
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setProgress((p) => {
        const next = p + dt * 0.12; // full journey over ~8.3s
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  const camerasForMap: Camera[] = cameras || [];

  function exportReport() {
    if (!traj) return;
    const blob = new Blob([JSON.stringify(traj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `netra-x-trajectory-${traj.vehicle}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activePointIndex = traj ? Math.round(progress * (traj.points.length - 1)) : 0;

  return (
    <div>
      <TopBar title="Trajectory Explorer" subtitle="Cross-camera journey reconstruction" />
      <div className="p-5 lg:p-8 space-y-5">
        <Panel>
          <div className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && setPlate(plateInput.trim())}
                className="w-full bg-panel2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono outline-none focus:border-primary/50"
                placeholder="License plate"
              />
            </div>
            <button
              onClick={() => setPlate(plateInput.trim())}
              className="px-4 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-semibold border border-primary/30"
            >
              Load
            </button>
          </div>
        </Panel>

        {loading && <Spinner label="Reconstructing trajectory…" />}
        {error && !loading && (
          <Panel>
            {error.includes("Connection lost") ? <ConnectionLost onRetry={reload} /> : <EmptyState title="No trajectory found" description={error} />}
          </Panel>
        )}

        {traj && !loading && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <Panel
                title={`ROUTE — ${maskPlate(traj.vehicle)}`}
                actions={<span className="text-[11px] text-success font-semibold">{Math.round(traj.confidence * 100)}% confidence</span>}
              >
                {camerasForMap.length > 0 && (
                  <CityMap
                    cameras={camerasForMap}
                    highlightPath={traj.points.map((p) => p.camera_id)}
                    activeCameraId={traj.points[activePointIndex]?.camera_id}
                    vehicleMarkerProgress={playing || progress > 0 ? progress : undefined}
                    onCameraClick={(c) => {
                      const p = traj.points.find((pt) => pt.camera_id === c.camera_id);
                      if (p) setSelectedPoint(p);
                    }}
                    height={420}
                  />
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 text-primary text-xs font-semibold border border-primary/30"
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Replay Journey"}
                  </button>
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setProgress(0);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-muted text-xs font-semibold border border-border"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                  <button
                    onClick={exportReport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-muted text-xs font-semibold border border-border ml-auto"
                  >
                    <Download size={14} /> Export Report
                  </button>
                </div>
              </Panel>

              <Panel title="TIMELINE">
                <div className="flex overflow-x-auto gap-6 pb-2">
                  {traj.points.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPoint(p)}
                      className="flex flex-col items-center gap-2 shrink-0"
                    >
                      <span className="text-[11px] font-mono text-muted">{new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 ${
                          selectedPoint?.camera_id === p.camera_id ? "bg-primary border-primary" : "bg-panel border-border"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-muted">{p.camera_id}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title={selectedPoint ? `CAMERA ${selectedPoint.camera_id}` : "SELECT A POINT"}>
              {selectedPoint ? (
                <div className="space-y-3 text-sm">
                  <DetailRow label="Time" value={new Date(selectedPoint.timestamp).toLocaleTimeString()} />
                  <DetailRow label="Road" value={selectedPoint.road_id} />
                  <DetailRow label="Direction" value={selectedPoint.direction} />
                  <DetailRow label="Speed" value={`${selectedPoint.speed_kmh} km/h`} />
                  <DetailRow label="OCR" value={`${(selectedPoint.confidence * 100).toFixed(1)}%`} />
                  <DetailRow label="Observation confidence" value={`${(selectedPoint.confidence * 100).toFixed(1)}%`} />
                </div>
              ) : (
                <EmptyState title="No point selected" description="Click a point on the timeline or map." />
              )}

              <div className="mt-6 pt-4 border-t border-border/60 space-y-2 text-sm">
                <DetailRow label="Total distance" value={`${traj.distance_km.toFixed(1)} km`} />
                <DetailRow label="Avg speed" value={`${traj.avg_speed.toFixed(0)} km/h`} />
                <DetailRow label="Start" value={new Date(traj.start_time).toLocaleTimeString()} />
                <DetailRow label="End" value={new Date(traj.end_time).toLocaleTimeString()} />
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
