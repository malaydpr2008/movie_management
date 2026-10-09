"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/ai";
import { AssetFile } from "@/lib/types";

export const aiKeys = {
  all: ["ai"] as const,
  pendingBreakdown: (projectId: string) => ["pendingBreakdown", projectId] as const,
  assets: () => ["aiAssets"] as const,
};

export function usePendingBreakdown(projectId: string) {
  return useQuery<{ data: { scenes: any[] } | null }>({
    queryKey: aiKeys.pendingBreakdown(projectId),
    queryFn: () => aiApi.getPendingBreakdown(projectId),
    enabled: Boolean(projectId),
  });
}

export function useApproveBreakdown(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenes: any[]) => aiApi.approveBreakdown(projectId, scenes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.pendingBreakdown(projectId) });
      queryClient.invalidateQueries({ queryKey: ["projectTree", projectId] });
    },
  });
}

export function useSendChatMessage(projectId: string) {
  return useMutation({
    mutationFn: (messages: { role: string; content: string; image_url?: string | null }[]) =>
      aiApi.sendChatMessage(projectId, messages),
  });
}

export function useUploadTempImage() {
  return useMutation({
    mutationFn: (file: File) => aiApi.uploadTempImage(file),
  });
}

export function useAiAssets() {
  return useQuery<{ files: AssetFile[]; error?: string }>({
    queryKey: aiKeys.assets(),
    queryFn: () => aiApi.getAssets(),
  });
}
