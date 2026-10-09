"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { breakdownApi } from "@/lib/api/breakdown";
import {
  CatalogsResponse,
  BreakdownSummary,
  SceneBreakdownItem,
  ContinuityPhoto,
} from "@/lib/types";

export const breakdownKeys = {
  all: ["breakdown"] as const,
  catalogs: (projectId: string) => ["catalogs", projectId] as const,
  summary: (projectId: string) => ["breakdownSummary", projectId] as const,
  sceneItems: (sceneId: string) => ["sceneBreakdown", sceneId] as const,
  continuity: (sceneId: string) => ["continuityPhotos", sceneId] as const,
};

export function useCatalogs(projectId: string) {
  return useQuery<CatalogsResponse>({
    queryKey: breakdownKeys.catalogs(projectId),
    queryFn: () => breakdownApi.getCatalogs(projectId),
    enabled: Boolean(projectId),
  });
}

export function useBreakdownSummary(projectId: string) {
  return useQuery<BreakdownSummary>({
    queryKey: breakdownKeys.summary(projectId),
    queryFn: () => breakdownApi.getBreakdownSummary(projectId),
    enabled: Boolean(projectId),
  });
}

export function useSceneBreakdownItems(sceneId: string) {
  return useQuery<SceneBreakdownItem[]>({
    queryKey: breakdownKeys.sceneItems(sceneId),
    queryFn: () => breakdownApi.getSceneBreakdownItems(sceneId),
    enabled: Boolean(sceneId),
  });
}

export function useContinuityPhotos(sceneId: string) {
  return useQuery<ContinuityPhoto[]>({
    queryKey: breakdownKeys.continuity(sceneId),
    queryFn: () => breakdownApi.getContinuityPhotos(sceneId),
    enabled: Boolean(sceneId),
  });
}

export function useAddBreakdownItem(sceneId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      element_type: string;
      prop_id?: string;
      costume_id?: string;
      custom_notes?: string;
      is_continuity_critical?: boolean;
    }) => breakdownApi.addSceneBreakdownItem(sceneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breakdownKeys.sceneItems(sceneId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: breakdownKeys.summary(projectId) });
        queryClient.invalidateQueries({ queryKey: breakdownKeys.catalogs(projectId) });
      }
    },
  });
}

export function useDeleteBreakdownItem(sceneId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => breakdownApi.deleteBreakdownItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: breakdownKeys.sceneItems(sceneId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: breakdownKeys.summary(projectId) });
      }
    },
  });
}
