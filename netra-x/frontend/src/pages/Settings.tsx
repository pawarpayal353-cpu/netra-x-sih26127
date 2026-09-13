import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel } from "../components/ui";
import { useApp } from "../lib/AppContext";
import { api, ApiError } from "../lib/api";
import { Eye, EyeOff, RotateCcw, ShieldCheck } from "lucide-react";

const ROLES = ["Admin", "Operator", "Analyst", "Auditor"];

const AUDIT_LOG = [
  { actor: "Admin", action: "Enabled live simulation", time: "09:12:04" },
  { actor: "Operator", action: "Acknowledged alert #A-1029", time: "09:15:41" },
  { actor: "Analyst", action: "Exported Congestion Report", time: "09:21:07" },
];

export default function Settings() {
  const { privacyMode, setPrivacyMode, role, setRole } = useApp();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [simOn, setSimOn] = useState(true);

  async function resetDemo() {
    setResetting(true);
    setResetMsg(null);
    try {
      await api.resetDemo();
      setResetMsg("Demo state reset — 42 cameras and fresh synthetic data reseeded.");
    } catch (e) {
      setResetMsg(e instanceof ApiError ? e.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  async function toggleSim(v: boolean) {
    setSimOn(v);
    try {
      await api.toggleSimulation(v);
    } catch {
      /* connection lost is surfaced elsewhere */
    }
  }

  return (
    <div>
      <TopBar title="Settings" subtitle="Privacy, access control, and demo controls" />
      <div className="p-5 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
        <Panel title="PRIVACY MODE">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {privacyMode ? <EyeOff size={16} className="text-primary" /> : <Eye size={16} className="text-muted" />}
              Mask license plates (e.g. MH12••••34)
            </div>
            <Toggle checked={privacyMode} onChange={setPrivacyMode} />
          </div>
        </Panel>

        <Panel title="ROLE (RBAC)">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${
                  role === r ? "bg-primary/15 text-primary border-primary/30" : "text-muted border-border"
                }`}
              >
                <ShieldCheck size={14} /> {r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-3">Current role determines which actions appear enabled across NETRA-X (demo-scoped).</p>
        </Panel>

        <Panel title="LIVE SIMULATION">
          <div className="flex items-center justify-between">
            <span className="text-sm">Simulation engine</span>
            <Toggle checked={simOn} onChange={toggleSim} onLabel="ON" offLabel="OFF" />
          </div>
        </Panel>

        <Panel title="DEMO MODE">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-warning font-semibold">● DEMO MODE ACTIVE</span>
          </div>
          <button
            onClick={resetDemo}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/15 text-danger text-xs font-semibold border border-danger/30 disabled:opacity-50"
          >
            <RotateCcw size={14} /> {resetting ? "Resetting…" : "Reset Demo"}
          </button>
          {resetMsg && <p className="text-[11px] text-muted mt-2">{resetMsg}</p>}
        </Panel>

        <Panel title="AUDIT LOG" className="lg:col-span-2">
          <div className="space-y-2">
            {AUDIT_LOG.map((a, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-border/40 last:border-0">
                <span><span className="text-primary font-medium">{a.actor}</span> — {a.action}</span>
                <span className="text-muted text-xs">{a.time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, onLabel, offLabel }: { checked: boolean; onChange: (v: boolean) => void; onLabel?: string; offLabel?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6.5 rounded-full flex items-center px-0.5 transition-colors ${checked ? "bg-primary/40" : "bg-white/10"}`}
      style={{ height: 26 }}
      aria-pressed={checked}
    >
      <span className={`w-5 h-5 rounded-full bg-ink transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0"}`} />
    </button>
  );
}
