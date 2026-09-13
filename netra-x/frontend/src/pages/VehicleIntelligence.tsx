import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Panel, EmptyState, Spinner } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useApp } from "../lib/AppContext";
import type { VehicleSearchResult } from "../types";
import { Search, ArrowRight, Car } from "lucide-react";

const EXAMPLES = ["MH12AB1234", "MH14CD5678", "KA01EF9012", "DL01GH3456"];

export default function VehicleIntelligence() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<VehicleSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { maskPlate } = useApp();
  const navigate = useNavigate();

  async function search(p: string) {
    const q = p.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.searchVehicle(q);
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar title="Vehicle Intelligence" subtitle="Search any recognized license plate" />
      <div className="p-5 lg:p-8 space-y-6 max-w-4xl">
        <Panel>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && search(plate)}
                placeholder="Enter license plate..."
                className="w-full bg-panel2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm font-mono tracking-wide outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={() => search(plate)}
              className="px-5 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-semibold border border-primary/30 hover:bg-primary/25 transition"
            >
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setPlate(ex);
                  search(ex);
                }}
                className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/5 text-muted hover:text-ink border border-border"
              >
                {ex}
              </button>
            ))}
          </div>
        </Panel>

        {loading && <Spinner label="Searching NETRA-X observation records…" />}

        {error && !loading && (
          <Panel>
            <EmptyState title="No results" description={error} />
          </Panel>
        )}

        {result && !loading && (
          <Panel title="VEHICLE IDENTITY">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 text-2xl font-bold font-mono tracking-wider">
                  <Car size={22} className="text-primary" />
                  {maskPlate(result.plate)}
                </div>
                <p className="text-xs text-muted mt-1 capitalize">{result.vehicle_type}</p>
              </div>
              {result.has_trajectory && (
                <button
                  onClick={() => navigate(`/trajectory-explorer?plate=${result.plate}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25"
                >
                  View Trajectory <ArrowRight size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              <Stat label="OCR CONFIDENCE" value={`${(result.ocr_confidence * 100).toFixed(1)}%`} accent="success" />
              <Stat label="OBSERVATIONS" value={String(result.observations_count)} />
              <Stat label="DISTANCE TRAVELED" value={result.distance_km ? `${result.distance_km.toFixed(1)} km` : "—"} />
              <Stat label="AVG SPEED" value={result.avg_speed ? `${result.avg_speed.toFixed(0)} km/h` : "—"} />
              <Stat label="FIRST SEEN" value={new Date(result.first_seen).toLocaleTimeString()} />
              <Stat label="LAST SEEN" value={new Date(result.last_seen).toLocaleTimeString()} />
            </div>

            <p className="text-xs text-muted mb-2">CAMERA SEQUENCE</p>
            <div className="flex flex-wrap gap-2">
              {result.camera_sequence.map((c, i) => (
                <span key={i} className="text-[11px] font-mono px-2 py-1 rounded-md bg-white/5 border border-border">
                  {c}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {!result && !loading && !error && (
          <Panel>
            <EmptyState title="Search for a vehicle" description="Enter a license plate above, or try one of the example plates." />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" }) {
  return (
    <div className="bg-panel2 border border-border rounded-lg p-3">
      <div className="text-[10px] text-muted tracking-wide mb-1">{label}</div>
      <div className={`text-lg font-bold ${accent === "success" ? "text-success" : "text-ink"}`}>{value}</div>
    </div>
  );
}
