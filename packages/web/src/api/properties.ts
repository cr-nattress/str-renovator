import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type {
  DbProperty,
  CreatePropertyDto,
  UpdatePropertyDto,
  AvailableAction,
} from "@str-renovator/shared";
import { apiFetch } from "./client";

export type PropertyWithSummary = DbProperty & {
  photo_count: number;
  thumbnail_urls: string[];
  latest_analysis: {
    id: string;
    status: string;
    created_at: string;
  } | null;
};

export function useProperties() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<PropertyWithSummary[]>("/api/v1/properties", token!);
    },
  });
}

export type PropertyWithActions = DbProperty & {
  availableActions?: AvailableAction[];
};

export function useProperty(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<PropertyWithActions>(`/api/v1/properties/${id}`, token!);
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePropertyDto) => {
      const token = await getToken();
      return apiFetch<DbProperty>("/api/v1/properties", token!, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdateProperty(id: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePropertyDto) => {
      const token = await getToken();
      return apiFetch<DbProperty>(`/api/v1/properties/${id}`, token!, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

interface CreateFromUrlResponse {
  data: {
    property: DbProperty;
    scrape_job_id: string;
  };
  events: unknown[];
  availableActions: AvailableAction[];
}

export function useCreatePropertyFromUrl() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { listingUrl: string }) => {
      const token = await getToken();
      return apiFetch<CreateFromUrlResponse>(
        "/api/v1/properties/from-url",
        token!,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteProperty() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch<void>(`/api/v1/properties/${id}`, token!, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
