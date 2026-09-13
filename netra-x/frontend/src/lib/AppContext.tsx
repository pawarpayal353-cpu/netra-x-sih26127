import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useLiveSocket, SocketStatus } from "../hooks/useLiveSocket";
import type { LiveEvent } from "../types";

interface AppContextValue {
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  role: string;
  setRole: (r: string) => void;
  liveEvents: LiveEvent[];
  socketStatus: SocketStatus;
  maskPlate: (plate: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [role, setRole] = useState("Admin");
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  const onEvent = useCallback((e: LiveEvent) => {
    setLiveEvents((prev) => [e, ...prev].slice(0, 60));
  }, []);

  const socketStatus = useLiveSocket(onEvent);

  const maskPlate = useCallback(
    (plate: string) => (privacyMode && plate ? `${plate.slice(0, 4)}••••${plate.slice(-2)}` : plate),
    [privacyMode]
  );

  return (
    <AppContext.Provider value={{ privacyMode, setPrivacyMode, role, setRole, liveEvents, socketStatus, maskPlate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
