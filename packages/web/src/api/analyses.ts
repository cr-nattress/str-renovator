import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type { DbAnalysis, CreateAnalysisDto } from "@str-renovator/shared";
import { apiFetch } from "./client";

export function useAnalyses(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["analyses", propertyId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DbAnalysis[]>(
        `/api/v1/properties/${propertyId}/analyses`,
        token!,
      );
    },
    enabled: !!propertyId,
  });
}

export function useAnalysis(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<
        DbAnalysis & { photos: (import("@str-renovator/shared").DbAnalysisPhoto & { photo: import("@str-renovator/shared").DbPhoto })[] }
      >(`/api/v1/analyses/${id}`, token!);
    },
    enabled: !!id,
  });
}

export function useCreateAnalysis(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data?: CreateAnalysisDto) => {
      const token = await getToken();
      return apiFetch<DbAnalysis>(
        `/api/v1/properties/${propertyId}/analyses`,
        token!,
        {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses", propertyId] });
    },
  });
}
