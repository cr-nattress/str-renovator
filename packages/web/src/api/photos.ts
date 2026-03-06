import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type { DbPhoto } from "@str-renovator/shared";
import { apiFetch } from "./client";

const BASE_URL = import.meta.env.VITE_API_URL || "";

export function usePhotos(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["photos", propertyId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DbPhoto[]>(
        `/api/v1/properties/${propertyId}/photos`,
        token!,
      );
    },
    enabled: !!propertyId,
  });
}

export function useUploadPhotos(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const token = await getToken();
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));

      const res = await fetch(
        `${BASE_URL}/api/v1/properties/${propertyId}/photos`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }
      return res.json() as Promise<DbPhoto[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", propertyId] });
    },
  });
}

export function useDeletePhoto(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: string) => {
      const token = await getToken();
      return apiFetch<void>(`/api/v1/photos/${photoId}`, token!, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", propertyId] });
    },
  });
}
