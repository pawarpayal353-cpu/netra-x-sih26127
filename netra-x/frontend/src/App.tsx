import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./lib/AppContext";
import { Shell } from "./components/Shell";
import Overview from "./pages/Overview";
import CommandCenter from "./pages/CommandCenter";
import VehicleIntelligence from "./pages/VehicleIntelligence";
import TrajectoryExplorer from "./pages/TrajectoryExplorer";
import TrafficAnalytics from "./pages/TrafficAnalytics";
import MobilityGraph from "./pages/MobilityGraph";
import Alerts from "./pages/Alerts";
import CameraNetwork from "./pages/CameraNetwork";
import AIAnalyst from "./pages/AIAnalyst";
import Reports from "./pages/Reports";
import SystemHealth from "./pages/SystemHealth";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/vehicle-intelligence" element={<VehicleIntelligence />} />
            <Route path="/trajectory-explorer" element={<TrajectoryExplorer />} />
            <Route path="/traffic-analytics" element={<TrafficAnalytics />} />
            <Route path="/mobility-graph" element={<MobilityGraph />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/camera-network" element={<CameraNetwork />} />
            <Route path="/ai-analyst" element={<AIAnalyst />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/system-health" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AppProvider>
  );
}
