"use client";

import * as React from "react";
import type { DashboardMetricsByRole, DashboardRole } from "@/lib/dashboard/types";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function getErrorMessage(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const maybe = (json as Record<string, unknown>).error;
  return typeof maybe === "string" ? maybe : null;
}

export function useLiveMetrics(role: DashboardRole) {
  type Data = DashboardMetricsByRole[typeof role];

  const [state, setState] = React.useState<State<Data>>({
    data: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: number | null = null;

    const setData = (data: Data) => {
      if (stopped) return;
      setState({ data, loading: false, error: null } as State<Data>);
    };

    const setError = (message: string) => {
      if (stopped) return;
      setState((s) => ({ ...s, loading: false, error: message }));
    };

    const fetchOnce = async () => {
      const res = await fetch(`/api/dashboard/${role}`, { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getErrorMessage(json) || "Failed to load metrics");
      setData(json as Data);
    };

    const startPolling = () => {
      if (pollTimer != null) return;

      const tick = async () => {
        try {
          await fetchOnce();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load metrics");
        }
      };

      void tick();
      pollTimer = window.setInterval(() => void tick(), 8000);
    };

    // Prefer SSE. If it errors (or is unsupported), fallback to polling.
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        es = new EventSource(`/api/live?role=${role}`, { withCredentials: true });

        es.addEventListener("metrics", (evt) => {
          try {
            const parsed = JSON.parse((evt as MessageEvent).data);
            setData(parsed as Data);
          } catch {
            // ignore
          }
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          startPolling();
        };
      } catch {
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      stopped = true;
      if (es) es.close();
      if (pollTimer != null) window.clearInterval(pollTimer);
    };
  }, [role]);

  return state;
}
