import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "./client";

export interface ScrapeJob {
  id: string;
  property_id: string;
  listing_url: string;
  status: "pending" | "scraping" | "downloading" | "completed" | "failed";
  total_photos: number;
  downloaded_photos: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function useScrapeJob(jobId: string | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["scrape-job", jobId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ScrapeJob>(`/api/v1/scrape-jobs/${jobId}`, token!);
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000; // Poll every 2s while in progress
    },
  });
}

export function useScrapeJobs(propertyId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["scrape-jobs", propertyId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ScrapeJob[]>(
        `/api/v1/properties/${propertyId}/scrape-jobs`,
        token!
      );
    },
  });
}

export function useStartScrape(propertyId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listingUrl: string) => {
      const token = await getToken();
      return apiFetch<{ scrape_job_id: string }>(
        `/api/v1/properties/${propertyId}/scrape`,
        token!,
        {
          method: "POST",
          body: JSON.stringify({ listing_url: listingUrl }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scrape-jobs", propertyId],
      });
    },
  });
}
