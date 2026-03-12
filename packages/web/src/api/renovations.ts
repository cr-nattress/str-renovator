import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type {
  DbRenovation,
  DbAnalysisPhoto,
  DbPhoto,
  SubmitFeedbackDto,
  DbFeedback,
  AvailableAction,
} from "@str-renovator/shared";
import { apiFetch } from "./client";

export interface RenovationWithDetails extends DbRenovation {
  url?: string | null;
  feedback?: DbFeedback;
}

export interface AnalysisPhotoWithDetails extends DbAnalysisPhoto {
  photo: DbPhoto & { url?: string | null };
  full_renovation_url?: string | null;
  renovation_images: RenovationWithDetails[];
  availableActions?: AvailableAction[];
}

export function useRenovations(analysisPhotoId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["renovations", analysisPhotoId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AnalysisPhotoWithDetails>(
        `/api/v1/analysis-photos/${analysisPhotoId}/renovations`,
        token!,
      );
    },
    enabled: !!analysisPhotoId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing =
        data.full_renovation_status === "processing" ||
        data.renovation_images.some((r) => r.status === "processing" || r.status === "pending");
      return hasProcessing ? 5000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export function useSubmitFeedback(renovationId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SubmitFeedbackDto) => {
      const token = await getToken();
      return apiFetch<DbFeedback>(
        `/api/v1/renovations/${renovationId}/feedback`,
        token!,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renovations"] });
    },
  });
}

export function useRerunRenovation(renovationId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedback?: string) => {
      const token = await getToken();
      return apiFetch<DbRenovation>(
        `/api/v1/renovations/${renovationId}/rerun`,
        token!,
        {
          method: "POST",
          body: JSON.stringify({ feedback }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renovations"] });
    },
  });
}
