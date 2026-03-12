import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type {
  DbDesignJourneyItem,
  CreateJourneyItemDto,
  UpdateJourneyItemDto,
  ActionImageStatus,
} from "@str-renovator/shared";

export interface JourneyItemWithImage extends DbDesignJourneyItem {
  image_url: string | null;
}

export interface JourneyItemDetail extends JourneyItemWithImage {
  source_photo_url: string | null;
}
import { apiFetch } from "./client";

const ACTIVE_STATUSES: ActionImageStatus[] = ["pending", "processing"];

export function useJourneyItem(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["journey-item", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<JourneyItemDetail>(
        `/api/v1/journey/${id}`,
        token!,
      );
    },
    enabled: !!id,
  });
}

export function useJourneyItems(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["journey", propertyId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<JourneyItemWithImage[]>(
        `/api/v1/properties/${propertyId}/journey`,
        token!,
      );
    },
    enabled: !!propertyId,
    refetchInterval: (query) => {
      const items = query.state.data;
      if (!items) return false;
      const hasActive = items.some((item) =>
        ACTIVE_STATUSES.includes(item.image_status)
      );
      return hasActive ? 5000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

export interface JourneySummary {
  total_estimated: number;
  total_estimated_min: number;
  total_estimated_max: number;
  total_actual: number;
  by_status: Record<string, number>;
}

export function useJourneySummary(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["journey", propertyId, "summary"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<JourneySummary>(
        `/api/v1/properties/${propertyId}/journey/summary`,
        token!,
      );
    },
    enabled: !!propertyId,
  });
}

export function useCreateJourneyItem(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateJourneyItemDto) => {
      const token = await getToken();
      return apiFetch<DbDesignJourneyItem>(
        `/api/v1/properties/${propertyId}/journey`,
        token!,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey", propertyId] });
    },
  });
}

export function useUpdateJourneyItem(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateJourneyItemDto;
    }) => {
      const token = await getToken();
      return apiFetch<DbDesignJourneyItem>(
        `/api/v1/journey/${id}`,
        token!,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journey", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["journey-item", variables.id] });
    },
  });
}
