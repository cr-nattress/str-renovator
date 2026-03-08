import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "./client";

export interface UsageStats {
  totalTokens: number;
  totalAnalyses: number;
  totalRenovations: number;
  totalJourneyImages: number;
  byModel: { model: string; tokens: number; count: number }[];
}

export function useUsageStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<UsageStats>("/api/v1/admin/usage", token!);
    },
  });
}
