/**
 * @module useStreamProgress
 * @capability Streaming
 * @layer Surface
 *
 * Generic SSE hook for consuming StreamEvent streams from the platform.
 * Handles auth token injection, EventSource lifecycle, React Query
 * invalidation on completion, and typed state management.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import type { StreamEvent } from "@str-renovator/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface StreamProgressState {
  currentStatus: string | null;
  currentMessage: string | null;
  progress: { completed: number; total: number } | null;
  isConnected: boolean;
  error: string | null;
  isDone: boolean;
}

interface UseStreamProgressOptions {
  enabled?: boolean;
  invalidateKeys?: string[][];
  onDone?: () => void;
  onError?: (message: string) => void;
}

export function useStreamProgress(
  url: string,
  options: UseStreamProgressOptions = {},
) {
  const { enabled = true, invalidateKeys, onDone, onError } = options;
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;

  const [state, setState] = useState<StreamProgressState>({
    currentStatus: null,
    currentMessage: null,
    progress: null,
    isConnected: false,
    error: null,
    isDone: false,
  });

  const connect = useCallback(async () => {
    if (!enabled || !url) return;

    const token = await getToken();
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const fullUrl = `${BASE_URL}${url}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as StreamEvent;

      setState((prev) => {
        const next = { ...prev };

        switch (data.type) {
          case "status":
            next.currentStatus = data.status;
            if (data.message) next.currentMessage = data.message;
            break;
          case "progress":
            next.progress = { completed: data.completed, total: data.total };
            if (data.message) next.currentMessage = data.message;
            break;
          case "done":
            next.isDone = true;
            next.isConnected = false;
            if (data.message) next.currentMessage = data.message;
            if (invalidateKeys) {
              for (const key of invalidateKeys) {
                queryClient.invalidateQueries({ queryKey: key });
              }
            }
            onDoneRef.current?.();
            es.close();
            break;
          case "error":
            next.error = data.message;
            next.isConnected = false;
            onErrorRef.current?.(data.message);
            es.close();
            break;
        }

        return next;
      });
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      es.close();
    };
  }, [enabled, url, getToken, queryClient, invalidateKeys]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return state;
}
