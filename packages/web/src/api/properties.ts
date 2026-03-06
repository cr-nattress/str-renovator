import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type {
  DbProperty,
  CreatePropertyDto,
  UpdatePropertyDto,
} from "@str-renovator/shared";
import { apiFetch } from "./client";

export function useProperties() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DbProperty[]>("/api/v1/properties", token!);
    },
  });
}

export function useProperty(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DbProperty>(`/api/v1/properties/${id}`, token!);
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
