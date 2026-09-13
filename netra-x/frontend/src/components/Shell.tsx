import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Radio, Car, Route, BarChart3, Share2, AlertTriangle,
  Camera as CameraIcon, Bot, FileText, HeartPulse, Settings as SettingsIcon,
  Menu, X, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/command-center", label: "Live Command Center", icon: Radio },
  { to: "/vehicle-intelligence", label: "Vehicle Intelligence", icon: Car },
  { to: "/trajectory-explorer", label: "Trajectory Explorer", icon: Route },
  { to: "/traffic-analytics", label: "Traffic Analytics", icon: BarChart3 },
  { to: "/mobility-graph", label: "City Mobility Graph", icon: Share2 },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/camera-network", label: "Camera Network", icon: CameraIcon },
  { to: "/ai-analyst", label: "AI Traffic Analyst", icon: Bot },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/system-health", label: "System Health", icon: HeartPulse },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Shell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/60 glass">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 glass border-r border-border/60 flex flex-col">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} showClose onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 glass border-b border-border/60 flex items-center justify-between px-4 py-3">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open navigation" className="text-ink">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <span className="font-bold tracking-wide text-sm">NETRA-X</span>
          </div>
          <div className="w-6" />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  showClose,
  onClose,
}: {
  onNavigate: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-extrabold tracking-wide text-ink leading-none">NETRA-X</div>
            <div className="text-[10px] text-muted tracking-wider mt-1">CITY MOBILITY INTEL</div>
          </div>
        </div>
        {showClose && (
          <button onClick={onClose} aria-label="Close navigation" className="text-muted">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/12 text-primary border border-primary/25"
                  : "text-muted hover:text-ink hover:bg-white/5 border border-transparent"
              )
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-border/60 text-[11px] text-muted">
        SIH26127 · Demo Mode
      </div>
    </>
  );
}
