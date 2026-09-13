import { useState } from "react";
import { TopBar } from "../components/TopBar";
import { Panel, Spinner, KpiCard, ConnectionLost } from "../components/ui";
import { CityMap } from "../components/CityMap";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import type { GraphNode } from "../types";

export default function MobilityGraph() {
  const { data: graph, error, reload } = useFetch(() => api.graph(), [], 15000);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  if (error) return (
    <div>
      <TopBar title="City Mobility Graph" />
      <div className="p-8"><ConnectionLost onRetry={reload} /></div>
    </div>
  );

  return (
    <div>
      <TopBar title="City Mobility Graph" subtitle="Every camera is a node. Every road transition is an edge." />
      <div className="p-5 lg:p-8 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="NODES" value={graph?.stats.nodes ?? "—"} />
          <KpiCard label="EDGES" value={graph?.stats.edges ?? "—"} />
          <KpiCard label="ACTIVE FLOWS" value={graph?.stats.active_flows ?? "—"} accent="success" />
          <KpiCard label="CRITICAL NODES" value={graph?.stats.critical_nodes ?? "—"} accent="warning" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="MOBILITY GRAPH" className="xl:col-span-2">
            {graph ? (
              <CityMap
                cameras={graph.nodes}
                activeCameraId={selected?.camera_id}
                onCameraClick={(c) => setSelected(c as GraphNode)}
                height={480}
              />
            ) : <Spinner />}
          </Panel>

          <Panel title={selected ? `NODE — ${selected.camera_id}` : "SELECT A NODE"}>
            {selected ? (
              <div className="space-y-3 text-sm">
                <Row label="Camera" value={selected.name} />
                <Row label="Road" value={selected.road_id} />
                <Row label="Status" value={selected.status} />
                <Row label="Incoming" value={`${Math.round(selected.vehicles_per_min * 41.3)} vehicles/hour`} />
                <Row label="Outgoing" value={`${Math.round(selected.vehicles_per_min * 39.4)} vehicles/hour`} />
                <Row label="Avg speed" value={`${Math.max(12, 55 - selected.vehicles_per_min)} km/h`} />
              </div>
            ) : (
              <p className="text-xs text-muted">Click any node on the graph to inspect its flow statistics.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
