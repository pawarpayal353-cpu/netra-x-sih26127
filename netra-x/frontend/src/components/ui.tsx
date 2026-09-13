import { ReactNode } from "react";
import clsx from "clsx";

export function Panel({
  children,
  className,
  title,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={clsx("glass rounded-xl2 shadow-panel", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          {title && <h3 className="text-sm font-semibold tracking-wide text-ink">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  suffix,
  accent = "primary",
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: "primary" | "success" | "warning" | "danger";
  icon?: ReactNode;
}) {
  const accentClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[accent];

  return (
    <div className="glass rounded-xl2 p-4 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between text-muted">
        <span className="text-[11px] font-medium tracking-wide">{label}</span>
        {icon}
      </div>
      <div className={clsx("text-2xl font-bold tabular-nums", accentClass)}>
        {value}
        {suffix && <span className="text-sm font-medium text-muted ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ONLINE: "bg-success/15 text-success border-success/30",
    DEGRADED: "bg-warning/15 text-warning border-warning/30",
    OFFLINE: "bg-danger/15 text-danger border-danger/30",
    NEW: "bg-danger/15 text-danger border-danger/30",
    ACKNOWLEDGED: "bg-warning/15 text-warning border-warning/30",
    INVESTIGATING: "bg-primary/15 text-primary border-primary/30",
    DISMISSED: "bg-muted/15 text-muted border-muted/30",
    HIGH: "bg-danger/15 text-danger border-danger/30",
    MEDIUM: "bg-warning/15 text-warning border-warning/30",
    LOW: "bg-muted/15 text-muted border-muted/30",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-[11px] font-semibold border", map[status] || "bg-muted/15 text-muted border-muted/30")}>
      {status}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 gap-2">
      <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted">?</div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-xs text-muted max-w-xs">{description}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm py-8 justify-center">
      <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function ConnectionLost({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
      <div className="w-10 h-10 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center text-danger">!</div>
      <p className="text-sm font-medium text-ink">Connection lost</p>
      <p className="text-xs text-muted max-w-xs">Could not reach the NETRA-X backend. Make sure the API server is running.</p>
      <button
        onClick={onRetry}
        className="mt-1 px-4 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold border border-primary/30 hover:bg-primary/25 transition"
      >
        Retry
      </button>
    </div>
  );
}
