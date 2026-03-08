import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import type { SSEEvent, AnalysisStatus } from "@str-renovator/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface RealtimeState {
  status: AnalysisStatus | null;
  completedPhotos: number;
  totalPhotos: number;
  completedBatches: number;
  totalBatches: number;
  failedBatches: number;
  events: SSEEvent[];
  isConnected: boolean;
  error: string | null;
}

export function useRealtimeUpdates(analysisId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectAttemptRef = useRef(0);

  const [state, setState] = useState<RealtimeState>({
    status: null,
    completedPhotos: 0,
    totalPhotos: 0,
    completedBatches: 0,
    totalBatches: 0,
    failedBatches: 0,
    events: [],
    isConnected: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (!analysisId) return;

    const token = await getToken();
    if (!token) {
      console.warn("[analysis] No auth token available — cannot connect to SSE");
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const attempt = ++connectAttemptRef.current;
    const url = `${BASE_URL}/api/v1/analyses/${analysisId}/stream?token=${encodeURIComponent(token)}`;

    console.group(`[analysis] Connecting to SSE (attempt ${attempt})`);
    console.log("Analysis ID:", analysisId);
    console.log("Endpoint:", url.replace(/token=[^&]+/, "token=<redacted>"));
    console.log("Timestamp:", new Date().toISOString());
    console.groupEnd();

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log("[analysis] SSE connection established");
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as SSEEvent;

      // Detailed console logging per event type
      switch (data.type) {
        case "status":
          console.log(
            `[analysis] Status changed → %c${data.status}`,
            "font-weight:bold;color:#2563eb",
          );
          break;
        case "progress":
          console.log(
            `[analysis] Progress: ${data.completed}/${data.total} photos complete`,
          );
          break;
        case "batch_progress":
          console.log(
            `[analysis] Batch ${data.batchIndex + 1}/${data.totalBatches} ${data.batchStatus}`,
          );
          break;
        case "done":
          console.log(
            "%c[analysis] Analysis completed successfully!",
            "font-weight:bold;color:#16a34a",
          );
          break;
        case "error":
          console.error("[analysis] Analysis failed:", data.message);
          break;
        default:
          console.log("[analysis] Unknown event:", data);
      }

      setState((prev) => {
        const newState: RealtimeState = {
          ...prev,
          events: [...prev.events, data],
          error: null,
        };

        switch (data.type) {
          case "status":
            newState.status = data.status;
            break;
          case "progress":
            newState.completedPhotos = data.completed;
            newState.totalPhotos = data.total;
            break;
          case "batch_progress":
            newState.totalBatches = data.totalBatches;
            if (data.batchStatus === "completed") {
              newState.completedBatches = prev.completedBatches + 1;
            } else if (data.batchStatus === "failed") {
              newState.failedBatches = prev.failedBatches + 1;
            }
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
            newState.error = data.message ?? "Something went wrong";
            es.close();
            break;
        }

        return newState;
      });
    };

    es.onerror = (err) => {
      console.warn("[analysis] SSE connection error — stream closed", err);
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
