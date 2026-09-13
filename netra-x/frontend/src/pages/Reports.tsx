import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, Spinner } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { Download, Eye, FileText } from "lucide-react";

const REPORTS = [
  { id: "daily-traffic", label: "Daily Traffic Report" },
  { id: "vehicle-trajectory", label: "Vehicle Trajectory Report" },
  { id: "congestion", label: "Congestion Report" },
  { id: "camera-health", label: "Camera Health Report" },
  { id: "alerts", label: "Alert Report" },
];

export default function Reports() {
  const [preview, setPreview] = useState<{ id: string; data: any } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string, download: boolean) {
    setLoading(id);
    setError(null);
    try {
      const res = await api.report(id);
      if (download) {
        const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `netra-x-${id}-report.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setPreview({ id, data: res });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Report generation failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <TopBar title="Reports" subtitle="Generate and export operational reports" />
      <div className="p-5 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="AVAILABLE REPORTS">
          <div className="space-y-2">
            {REPORTS.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <FileText size={16} className="text-primary" />
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
                <div className="flex gap-2">
                  <IconBtn onClick={() => load(r.id, false)} busy={loading === r.id}><Eye size={14} /></IconBtn>
                  <IconBtn onClick={() => load(r.id, true)} busy={loading === r.id}><Download size={14} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-danger mt-3">{error}</p>}
          <p className="text-[11px] text-muted mt-4">
            Reports export as structured JSON (PDF rendering can be layered on later using this same data — the pdf skill in the backend toolchain can format these for print).
          </p>
        </Panel>

        <Panel title={preview ? `PREVIEW — ${preview.id}` : "PREVIEW"}>
          {loading && <Spinner label="Generating report…" />}
          {!loading && preview && (
            <pre className="text-[11px] font-mono text-muted whitespace-pre-wrap max-h-[420px] overflow-y-auto bg-panel2 border border-border rounded-lg p-3">
              {JSON.stringify(preview.data, null, 2)}
            </pre>
          )}
          {!loading && !preview && <p className="text-xs text-muted">Click the eye icon on a report to preview it here.</p>}
        </Panel>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="w-8 h-8 rounded-md bg-white/5 border border-border flex items-center justify-center text-muted hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
