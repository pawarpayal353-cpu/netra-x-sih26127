import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";
import type { LiveEvent } from "../types";

export type SocketStatus = "connecting" | "connected" | "disconnected";

export function useLiveSocket(onEvent: (e: LiveEvent) => void) {
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/ws/live";

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        setStatus("disconnected");
        scheduleRetry();
        return;
      }

      ws.onopen = () => setStatus("connected");
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.kind === "live_event") {
            onEventRef.current(data as LiveEvent);
          }
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setStatus("disconnected");
        scheduleRetry();
      };
      ws.onerror = () => {
        ws?.close();
      };
    }

    function scheduleRetry() {
      if (cancelled) return;
      retryTimer = setTimeout(connect, 3000);
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return status;
}
