export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (e) {
    throw new ApiError("Connection lost — could not reach NETRA-X backend.", 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export const api = {
  dashboard: () => request<import("../types").DashboardData>("/api/dashboard"),
  cameras: () => request<import("../types").Camera[]>("/api/cameras"),
  camera: (id: string) => request<any>(`/api/cameras/${id}`),
  searchVehicle: (plate: string) =>
    request<import("../types").VehicleSearchResult>(`/api/vehicles/search?plate=${encodeURIComponent(plate)}`),
  trajectory: (plate: string) => request<import("../types").TrajectoryData>(`/api/vehicles/${plate}/trajectory`),
  trafficLive: () => request<import("../types").RoadMetric[]>("/api/traffic/live"),
  trafficForecast: () => request<any[]>("/api/traffic/forecast"),
  trafficOd: () => request<any[]>("/api/traffic/od"),
  trafficBottlenecks: () => request<any[]>("/api/traffic/bottlenecks"),
  graph: () => request<import("../types").MobilityGraph>("/api/graph"),
  alerts: (category?: string) => request<import("../types").AlertItem[]>(`/api/alerts${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  acknowledgeAlert: (id: number, status: string) =>
    request<any>(`/api/alerts/${id}/acknowledge`, { method: "POST", body: JSON.stringify({ status }) }),
  aiQuery: (query: string) => request<{ answer: string; evidence: any }>("/api/ai/query", { method: "POST", body: JSON.stringify({ query }) }),
  systemHealth: () => request<any>("/api/system/health"),
  toggleSimulation: (on: boolean) => request<any>("/api/system/simulation", { method: "POST", body: JSON.stringify({ on }) }),
  resetDemo: () => request<any>("/api/system/reset-demo", { method: "POST" }),
  report: (type: string) => request<any>(`/api/reports/${type}`),
};
