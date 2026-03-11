/**
 * @module edit-history API hooks
 * @capability Frontend hooks for edit history and undo
 * @layer Surface
 *
 * Provides React Query mutation for undoing field edits.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import type { DbEditHistory } from "@str-renovator/shared";
import { apiFetch } from "./client";

export function useUndoEdit() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (editHistoryId: string) => {
      const token = await getToken();
      return apiFetch<{ data: DbEditHistory }>(
        `/api/v1/edit-history/${editHistoryId}/undo`,
        token!,
        { method: "POST" },
      );
    },
    onSuccess: () => {
      // Invalidate broadly — the undo could affect any entity
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["analysis"] });
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });
}
