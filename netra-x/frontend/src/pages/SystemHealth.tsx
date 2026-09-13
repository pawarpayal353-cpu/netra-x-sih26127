import { TopBar } from "../components/TopBar";
import { Panel, Spinner, ConnectionLost } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import { CheckCircle2 } from "lucide-react";

const SERVICES = [
  { key: "api", label: "API" },
  { key: "database", label: "Database" },
  { key: "streaming", label: "Streaming" },
  { key: "ai_engine", label: "AI Engine" },
  { key: "gis", label: "GIS" },
];

export default function SystemHealth() {
  const { data: health, error, reload } = useFetch(() => api.systemHealth(), [], 8000);

  if (error) return (
    <div>
      <TopBar title="System Health" />
      <div className="p-8"><ConnectionLost onRetry={reload} /></div>
    </div>
  );

  return (
    <div>
      <TopBar title="System Health" subtitle="Operational status across NETRA-X services" />
      <div className="p-5 lg:p-8 space-y-5">
        {!health && <Spinner label="Checking system health…" />}
        {health && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {SERVICES.map((s) => (
                <Panel key={s.key}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-success" />
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <p className="text-[11px] text-success mt-1.5">{health[s.key]}</p>
                </Panel>
              ))}
            </div>

            <Panel title="METRICS">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="Cameras seeded" value={health.metrics.cameras_seeded} />
                <Metric label="Observations (total)" value={health.metrics.observations_total} />
                <Metric label="WebSocket clients" value={health.metrics.websocket_clients} />
                <Metric label="Live simulation" value={health.metrics.simulation_on ? "ON" : "OFF"} />
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-panel2 border border-border rounded-lg p-3">
      <div className="text-[10px] text-muted mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
