import { ReactNode } from "react";
import { useApp } from "../lib/AppContext";
import clsx from "clsx";

export function TopBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { socketStatus } = useApp();
  return (
    <div className="sticky top-0 z-20 glass border-b border-border/60 px-5 lg:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-lg lg:text-xl font-extrabold tracking-wide text-ink">{title}</h1>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              socketStatus === "connected" ? "bg-success animate-pulseGlow" : socketStatus === "connecting" ? "bg-warning" : "bg-danger"
            )}
          />
          {socketStatus === "connected" ? "LIVE" : socketStatus === "connecting" ? "CONNECTING" : "OFFLINE"}
        </div>
      </div>
    </div>
  );
}
