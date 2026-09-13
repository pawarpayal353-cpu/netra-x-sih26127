import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, StatusBadge, Spinner, EmptyState, ConnectionLost } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import { useApp } from "../lib/AppContext";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["ALL", "HIGH PRIORITY", "ROUTE_ANOMALY", "WATCHLIST", "CONGESTION", "CAMERA_HEALTH"];
const LABELS: Record<string, string> = {
  ALL: "All",
  "HIGH PRIORITY": "High Priority",
  ROUTE_ANOMALY: "Route Anomaly",
  WATCHLIST: "Watchlist",
  CONGESTION: "Congestion",
  CAMERA_HEALTH: "Camera Health",
};

export default function Alerts() {
  const [category, setCategory] = useState("ALL");
  const { data: alerts, error, reload } = useFetch(() => api.alerts(category), [category], 10000);
  const { maskPlate } = useApp();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function act(id: number, status: string) {
    setBusyId(id);
    try {
      await api.acknowledgeAlert(id, status);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <TopBar title="Alert Center" subtitle="Route anomalies, watchlist matches, congestion, and camera health" />
      <div className="p-5 lg:p-8 space-y-5">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                category === c ? "bg-primary/15 text-primary border-primary/30" : "text-muted border-border hover:text-ink"
              }`}
            >
              {LABELS[c]}
            </button>
          ))}
        </div>

        {error && <ConnectionLost onRetry={reload} />}
        {!error && !alerts && <Spinner label="Loading alerts…" />}
        {!error && alerts && alerts.length === 0 && <EmptyState title="No alerts in this category" />}

        <div className="space-y-3">
          {alerts?.map((a) => (
            <Panel key={a.alert_id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={a.severity} />
                    <span className="text-xs text-muted uppercase tracking-wide">{a.type.replace("_", " ")}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.vehicle_identity && (
                    <p className="font-mono text-sm text-ink mb-1">Vehicle: {maskPlate(a.vehicle_identity)}</p>
                  )}
                  <p className="text-xs text-muted mb-1">Confidence: {Math.round(a.confidence * 100)}%</p>
                  <p className="text-sm text-ink">{a.reason}</p>
                  <p className="text-[11px] text-muted mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {a.vehicle_identity && (
                    <ActionBtn onClick={() => navigate(`/trajectory-explorer?plate=${a.vehicle_identity}`)}>View Trajectory</ActionBtn>
                  )}
                  <ActionBtn disabled={busyId === a.alert_id} onClick={() => act(a.alert_id, "ACKNOWLEDGED")}>Acknowledge</ActionBtn>
                  <ActionBtn disabled={busyId === a.alert_id} onClick={() => act(a.alert_id, "INVESTIGATING")}>Investigate</ActionBtn>
                  <ActionBtn disabled={busyId === a.alert_id} onClick={() => act(a.alert_id, "DISMISSED")}>Dismiss</ActionBtn>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted hover:text-ink hover:bg-white/5 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
