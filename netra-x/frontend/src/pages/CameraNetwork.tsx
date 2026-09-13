import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, StatusBadge, Spinner, ConnectionLost } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import type { Camera } from "../types";

export default function CameraNetwork() {
  const { data: cameras, error, reload } = useFetch(() => api.cameras(), [], 15000);
  const [selected, setSelected] = useState<Camera | null>(null);
  const { data: detail } = useFetch(() => (selected ? api.camera(selected.camera_id) : Promise.resolve(null)), [selected?.camera_id]);

  if (error) return (
    <div>
      <TopBar title="Camera Network" />
      <div className="p-8"><ConnectionLost onRetry={reload} /></div>
    </div>
  );

  return (
    <div>
      <TopBar title="Camera Network" subtitle="All 42 cameras across the city" />
      <div className="p-5 lg:p-8">
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-[11px] border-b border-border/60">
                  <th className="py-2 pr-4 font-medium">Camera</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">FPS</th>
                  <th className="py-2 pr-4 font-medium">Latency</th>
                  <th className="py-2 pr-4 font-medium">OCR Confidence</th>
                  <th className="py-2 font-medium">Vehicles/min</th>
                </tr>
              </thead>
              <tbody>
                {!cameras && <tr><td colSpan={7}><Spinner /></td></tr>}
                {cameras?.map((c) => (
                  <tr
                    key={c.camera_id}
                    onClick={() => setSelected(c)}
                    className="border-b border-border/30 last:border-0 cursor-pointer hover:bg-white/5"
                  >
                    <td className="py-2.5 pr-4 font-mono">{c.camera_id}</td>
                    <td className="py-2.5 pr-4">{c.road_id}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-2.5 pr-4 font-mono">{c.fps} FPS</td>
                    <td className="py-2.5 pr-4 font-mono">{c.latency_ms} ms</td>
                    <td className="py-2.5 pr-4 font-mono">{(c.ocr_confidence * 100).toFixed(1)}%</td>
                    <td className="py-2.5 font-mono">{c.vehicles_per_min}/min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm h-full glass border-l border-border/60 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{selected.camera_id}</h3>
            <p className="text-sm text-muted mb-4">{selected.name}</p>
            {!detail && <Spinner />}
            {detail && (
              <>
                <div className="space-y-2 text-sm mb-5">
                  <Row label="Status" value={<StatusBadge status={detail.status} />} />
                  <Row label="FPS" value={`${detail.fps}`} />
                  <Row label="Latency" value={`${detail.latency_ms} ms`} />
                  <Row label="OCR confidence" value={`${(detail.ocr_confidence * 100).toFixed(1)}%`} />
                  <Row label="Vehicles/min" value={`${detail.vehicles_per_min}`} />
                </div>
                <p className="text-xs text-muted mb-2">RECENT OBSERVATIONS</p>
                <div className="space-y-1.5">
                  {detail.recent_observations?.map((o: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1.5 border-b border-border/30">
                      <span className="font-mono">{o.plate}</span>
                      <span className="text-muted">{new Date(o.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {detail.recent_observations?.length === 0 && <p className="text-xs text-muted">No recent observations.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
