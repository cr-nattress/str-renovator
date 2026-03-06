import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import type { SSEEvent, AnalysisStatus } from "@str-renovator/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface RealtimeState {
  status: AnalysisStatus | null;
  completedPhotos: number;
  totalPhotos: number;
  events: SSEEvent[];
  isConnected: boolean;
}

export function useRealtimeUpdates(analysisId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [state, setState] = useState<RealtimeState>({
    status: null,
    completedPhotos: 0,
    totalPhotos: 0,
    events: [],
    isConnected: false,
  });

  const connect = useCallback(async () => {
    if (!analysisId) return;

    const token = await getToken();
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${BASE_URL}/api/v1/analyses/${analysisId}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as SSEEvent;
      setState((prev) => {
        const newState = { ...prev, events: [...prev.events, data] };

        switch (data.type) {
          case "status":
            newState.status = data.status;
            break;
          case "progress":
            newState.completedPhotos = data.completed;
            newState.totalPhotos = data.total;
            break;
          case "done":
            newState.isConnected = false;
            queryClient.invalidateQueries({
              queryKey: ["analysis", analysisId],
            });
            es.close();
            break;
          case "error":
            newState.isConnected = false;
            es.close();
            break;
        }

        return newState;
      });
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      es.close();
    };
  }, [analysisId, getToken, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return state;
}
