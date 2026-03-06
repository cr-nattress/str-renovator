import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type {
  DbDesignJourneyItem,
  CreateJourneyItemDto,
  UpdateJourneyItemDto,
} from "@str-renovator/shared";
import { apiFetch } from "./client";

export function useJourneyItems(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["journey", propertyId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DbDesignJourneyItem[]>(
        `/api/v1/properties/${propertyId}/journey`,
        token!,
      );
    },
    enabled: !!propertyId,
  });
}

export interface JourneySummary {
  totalEstimated: number;
  totalActual: number;
  itemsByStatus: Record<string, number>;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey", propertyId] });
    },
  });
}
