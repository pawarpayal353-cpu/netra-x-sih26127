export interface DashboardData {
  cameras_online: number;
  cameras_total: number;
  vehicles_per_min: number;
  active_alerts: number;
  congestion_zones: number;
  avg_city_speed: number;
  anpr_confidence: number;
  simulation_on: boolean;
  updated_at: string;
}

export interface Camera {
  camera_id: string;
  name: string;
  road_id: string;
  latitude: number;
  longitude: number;
  direction: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  fps: number;
  latency_ms: number;
  ocr_confidence: number;
  vehicles_per_min: number;
}

export interface LiveEvent {
  kind: "live_event";
  observation: {
    camera_id: string;
    camera_name: string;
    plate: string;
    ocr_confidence: number;
    vehicle_type: string;
    timestamp: string;
    latitude: number;
    longitude: number;
  };
  alert: AlertItem | null;
  simulation_on: boolean;
}

export interface AlertItem {
  alert_id: number;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  vehicle_identity: string | null;
  camera_id: string | null;
  timestamp: string;
  reason: string;
  confidence: number;
  status: "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "DISMISSED";
}

export interface VehicleSearchResult {
  plate: string;
  vehicle_type: string;
  ocr_confidence: number;
  observations_count: number;
  distance_km: number | null;
  avg_speed: number | null;
  first_seen: string;
  last_seen: string;
  camera_sequence: string[];
  has_trajectory: boolean;
}

export interface TrajectoryPoint {
  camera_id: string;
  camera_name: string;
  road_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  sequence_number: number;
  confidence: number;
  speed_kmh: number;
  direction: string;
}

export interface TrajectoryData {
  vehicle: string;
  trajectory_id: number;
  confidence: number;
  distance_km: number;
  avg_speed: number;
  start_time: string;
  end_time: string;
  points: TrajectoryPoint[];
  transitions: any[];
}

export interface RoadMetric {
  road_id: string;
  vehicle_count: number;
  avg_speed: number;
  density: number;
  congestion_index: number;
  baseline_speed: number;
  timestamp: string;
}

export interface GraphNode extends Camera {}
export interface GraphEdge {
  from: string;
  to: string;
  road_id: string;
}
export interface MobilityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { nodes: number; edges: number; active_flows: number; critical_nodes: number };
}
