import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type { DbAnalysis, CreateAnalysisDto, AvailableAction } from "@str-renovator/shared";
import { apiFetch } from "./client";

export function useAnalyses(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["analyses", propertyId],
    queryFn: async () => {
      console.log("[analysis] Fetching analyses for property:", propertyId);
      const token = await getToken();
      const data = await apiFetch<DbAnalysis[]>(
        `/api/v1/properties/${propertyId}/analyses`,
        token!,
      );
      console.log("[analysis] Found %d analyses", data.length);
      return data;
    },
    enabled: !!propertyId,
  });
}

export type AnalysisWithPhotos = DbAnalysis & {
  analysis_photos: (import("@str-renovator/shared").DbAnalysisPhoto & {
    photos: import("@str-renovator/shared").DbPhoto & { url?: string };
  })[];
  availableActions?: AvailableAction[];
};

export function useAnalysis(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const token = await getToken();
      const data = await apiFetch<AnalysisWithPhotos>(
        `/api/v1/analyses/${id}`,
        token!,
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateAnalysis(analysisId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: { property_assessment?: string; style_direction?: string }) => {
      const token = await getToken();
      return apiFetch<DbAnalysis>(`/api/v1/analyses/${analysisId}`, token!, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis", analysisId] });
    },
  });
}

export function useArchiveAnalysis(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (analysisId: string) => {
      const token = await getToken();
      return apiFetch<void>(`/api/v1/analyses/${analysisId}/archive`, token!, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", propertyId] });
    },
  });
}

export function useRetryAnalysis(analysisId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiFetch<{ data: { id: string; status: string } }>(
        `/api/v1/analyses/${analysisId}/retry`,
        token!,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis", analysisId] });
    },
  });
}

export function useCreateAnalysis(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data?: CreateAnalysisDto) => {
      console.group("[analysis] Starting new analysis");
      console.log("Property ID:", propertyId);
      console.log("Options:", data ?? "(defaults)");
      console.log("Timestamp:", new Date().toISOString());
      console.groupEnd();

      const token = await getToken();
      const result = await apiFetch<DbAnalysis>(
        `/api/v1/properties/${propertyId}/analyses`,
        token!,
        {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        },
      );
      console.log(
        "[analysis] Analysis created — ID: %s, status: %s",
        result.id,
        result.status,
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", propertyId] });
    },
    onError: (err) => {
      console.error("[analysis] Failed to create analysis:", err.message);
    },
  });
}
