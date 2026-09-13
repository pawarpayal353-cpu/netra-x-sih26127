import { useMemo, useState } from "react";
import type { Camera } from "../types";

interface Props {
  cameras: Camera[];
  highlightPath?: string[]; // ordered camera_ids for a trajectory
  activeCameraId?: string | null;
  pulseCameraIds?: string[]; // recently-active cameras (live feed)
  onCameraClick?: (cam: Camera) => void;
  height?: number;
  vehicleMarkerProgress?: number; // 0..1 position along highlightPath, for replay
}

const W = 820;
const H = 560;
const PAD = 46;

function statusColor(status: string) {
  if (status === "ONLINE") return "#00F5A0";
  if (status === "DEGRADED") return "#FFC857";
  return "#FF3B5C";
}

export function CityMap({
  cameras,
  highlightPath,
  activeCameraId,
  pulseCameraIds = [],
  onCameraClick,
  height = 480,
  vehicleMarkerProgress,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { project, bounds } = useMemo(() => {
    if (cameras.length === 0) {
      return { project: (_lat: number, _lng: number) => ({ x: W / 2, y: H / 2 }), bounds: null };
    }
    const lats = cameras.map((c) => c.latitude);
    const lngs = cameras.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const project = (lat: number, lng: number) => {
      const x = PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (W - PAD * 2);
      const y = H - PAD - ((lat - minLat) / (maxLat - minLat || 1)) * (H - PAD * 2);
      return { x, y };
    };
    return { project, bounds: { minLat, maxLat, minLng, maxLng } };
  }, [cameras]);

  const camById = useMemo(() => Object.fromEntries(cameras.map((c) => [c.camera_id, c])), [cameras]);

  const roadGroups = useMemo(() => {
    const groups: Record<string, Camera[]> = {};
    for (const c of cameras) {
      groups[c.road_id] = groups[c.road_id] || [];
      groups[c.road_id].push(c);
    }
    return groups;
  }, [cameras]);

  const highlightPoints = (highlightPath || [])
    .map((id) => camById[id])
    .filter(Boolean)
    .map((c) => ({ ...project(c.latitude, c.longitude), camera: c }));

  let vehiclePos: { x: number; y: number } | null = null;
  if (vehicleMarkerProgress !== undefined && highlightPoints.length > 1) {
    const segments = highlightPoints.length - 1;
    const pos = Math.min(0.999, Math.max(0, vehicleMarkerProgress)) * segments;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = highlightPoints[idx];
    const b = highlightPoints[Math.min(idx + 1, highlightPoints.length - 1)];
    vehiclePos = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }

  return (
    <div className="relative w-full rounded-xl2 overflow-hidden border border-border bg-[#070C16]" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#101A2C" strokeWidth="1" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Roads: connect cameras within the same road sequentially */}
        {Object.entries(roadGroups).map(([road, cams]) => {
          const sorted = [...cams].sort((a, b) => a.camera_id.localeCompare(b.camera_id));
          const pts = sorted.map((c) => project(c.latitude, c.longitude));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
          return <path key={road} d={d} fill="none" stroke="#182238" strokeWidth={3} strokeLinecap="round" />;
        })}

        {/* Highlighted trajectory path */}
        {highlightPoints.length > 1 && (
          <path
            d={highlightPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke="#00E5FF"
            strokeWidth={3.5}
            strokeLinecap="round"
            className="flow-line"
            opacity={0.9}
          />
        )}

        {/* Camera nodes */}
        {cameras.map((c) => {
          const { x, y } = project(c.latitude, c.longitude);
          const isActive = c.camera_id === activeCameraId;
          const isPulsing = pulseCameraIds.includes(c.camera_id);
          const isOnHighlight = highlightPath?.includes(c.camera_id);
          const color = statusColor(c.status);
          return (
            <g
              key={c.camera_id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onClick={() => onCameraClick?.(c)}
              onMouseEnter={() => setHovered(c.camera_id)}
              onMouseLeave={() => setHovered((h) => (h === c.camera_id ? null : h))}
            >
              {isPulsing && <circle r={10} fill="url(#glow)" className="animate-pulseGlow" />}
              {isActive && <circle r={12} fill="none" stroke="#00E5FF" strokeWidth={2} opacity={0.8} />}
              <circle r={isOnHighlight ? 5.5 : 4} fill={color} stroke="#060A12" strokeWidth={1.5} />
              {(hovered === c.camera_id || isOnHighlight) && (
                <text x={8} y={-8} fontSize={10} fill="#F4F7FB" className="font-mono select-none">
                  {c.camera_id}
                </text>
              )}
            </g>
          );
        })}

        {/* Replay vehicle marker */}
        {vehiclePos && (
          <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`}>
            <circle r={9} fill="url(#glow)" />
            <circle r={5} fill="#00E5FF" stroke="#060A12" strokeWidth={1.5} />
          </g>
        )}
      </svg>

      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px] text-muted glass px-2 py-1 rounded-md">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> Online</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> Degraded</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" /> Offline</span>
      </div>
    </div>
  );
}
