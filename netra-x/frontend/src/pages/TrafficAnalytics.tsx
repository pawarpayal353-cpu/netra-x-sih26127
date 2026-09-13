import { TopBar } from "../components/TopBar";
import { Panel, Spinner, ConnectionLost } from "../components/ui";
import { useFetch } from "../hooks/useFetch";
import { api } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#00E5FF", "#00F5A0", "#FFC857", "#FF3B5C", "#7E8CA3", "#8B5CF6"];

export default function TrafficAnalytics() {
  const { data: roads, error, reload } = useFetch(() => api.trafficLive(), [], 10000);
  const { data: od } = useFetch(() => api.trafficOd(), []);
  const { data: bottlenecks } = useFetch(() => api.trafficBottlenecks(), [], 10000);

  if (error) return (
    <div>
      <TopBar title="Traffic Analytics" />
      <div className="p-8"><ConnectionLost onRetry={reload} /></div>
    </div>
  );

  return (
    <div>
      <TopBar title="Traffic Analytics" subtitle="City-wide density, speed, and utilization" />
      <div className="p-5 lg:p-8 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Panel title="AVERAGE SPEED BY ROAD">
            {roads ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={roads}>
                  <CartesianGrid stroke="#101A2C" vertical={false} />
                  <XAxis dataKey="road_id" tick={{ fontSize: 10, fill: "#7E8CA3" }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: "#7E8CA3" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0C1320", border: "1px solid #1B2740", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="avg_speed" fill="#00E5FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Spinner />}
          </Panel>

          <Panel title="VEHICLE VOLUME BY ROAD">
            {roads ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={roads}>
                  <CartesianGrid stroke="#101A2C" vertical={false} />
                  <XAxis dataKey="road_id" tick={{ fontSize: 10, fill: "#7E8CA3" }} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: "#7E8CA3" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0C1320", border: "1px solid #1B2740", borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="vehicle_count" stroke="#00F5A0" fill="#00F5A033" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Spinner />}
          </Panel>

          <Panel title="CONGESTION INDEX DISTRIBUTION">
            {roads ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roads} dataKey="congestion_index" nameKey="road_id" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {roads.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0C1320", border: "1px solid #1B2740", borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Spinner />}
          </Panel>

          <Panel title="TOP BOTTLENECKS">
            <div className="space-y-2">
              {bottlenecks?.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                  <span>{b.road_id}</span>
                  <span className={`font-semibold ${b.congestion_index > 0.6 ? "text-danger" : b.congestion_index > 0.4 ? "text-warning" : "text-success"}`}>
                    {Math.round(b.congestion_index * 100)}%
                  </span>
                </div>
              )) ?? <Spinner />}
            </div>
          </Panel>
        </div>

        <Panel title="ORIGIN-DESTINATION MATRIX">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-[11px] border-b border-border/60">
                  <th className="py-2 pr-4 font-medium">Origin</th>
                  <th className="py-2 pr-4 font-medium">Destination</th>
                  <th className="py-2 pr-4 font-medium">Vehicles</th>
                  <th className="py-2 font-medium">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {od?.map((row, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4">{row.origin}</td>
                    <td className="py-2 pr-4">{row.destination}</td>
                    <td className="py-2 pr-4 font-mono">{row.vehicles.toLocaleString()}</td>
                    <td className="py-2 font-mono">{row.avg_time_minutes}m</td>
                  </tr>
                )) ?? (
                  <tr><td colSpan={4}><Spinner /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
