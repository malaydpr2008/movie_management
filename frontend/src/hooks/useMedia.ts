"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@/lib/api/media";
import { MediaAsset } from "@/lib/types";

export const mediaKeys = {
  all: ["media"] as const,
  assets: (appLabel: string, modelName: string, objectId: string) =>
    ["mediaAssets", appLabel, modelName, objectId] as const,
};

export function useMediaAssets(appLabel: string, modelName: string, objectId: string) {
  return useQuery<MediaAsset[]>({
    queryKey: mediaKeys.assets(appLabel, modelName, objectId),
    queryFn: () => mediaApi.getMediaAssets(appLabel, modelName, objectId),
    enabled: Boolean(appLabel && modelName && objectId),
  });
}

export function useUploadMedia(appLabel: string, modelName: string, objectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mediaApi.uploadMedia(appLabel, modelName, objectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.assets(appLabel, modelName, objectId) });
      queryClient.invalidateQueries({ queryKey: ["mediaAssets"] });
    },
  });
}
