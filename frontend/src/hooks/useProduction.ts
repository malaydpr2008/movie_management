"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "@/lib/api/production";
import {
  ScheduleData,
  DoodData,
  DPROut,
  DPRIn,
} from "@/lib/types";

export const productionKeys = {
  all: ["production"] as const,
  schedule: (projectId: string) => ["schedule", projectId] as const,
  dood: (projectId: string) => ["dood", projectId] as const,
  dpr: (shootDayId: string) => ["dpr", shootDayId] as const,
};

export function useSchedule(projectId: string) {
  return useQuery<ScheduleData>({
    queryKey: productionKeys.schedule(projectId),
    queryFn: () => productionApi.getSchedule(projectId),
    enabled: Boolean(projectId),
  });
}

export function useDoodMatrix(projectId: string) {
  return useQuery<DoodData>({
    queryKey: productionKeys.dood(projectId),
    queryFn: () => productionApi.getDoodMatrix(projectId),
    enabled: Boolean(projectId),
  });
}

export function useDPR(shootDayId: string) {
  return useQuery<DPROut>({
    queryKey: productionKeys.dpr(shootDayId),
    queryFn: () => productionApi.getDPR(shootDayId),
    enabled: Boolean(shootDayId),
  });
}

export function useCreateShootDay(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { unit_id?: string; day_number: number; calendar_date: string; general_crew_call?: string; shooting_call?: string; hospital_address?: string }) =>
      productionApi.createShootDay({ project_id: projectId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.schedule(projectId) });
      queryClient.invalidateQueries({ queryKey: productionKeys.dood(projectId) });
    },
  });
}

export function useReorderStrip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { strip_id: string; target_shoot_day_id: string; new_order_index: string }) =>
      productionApi.reorderStrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.schedule(projectId) });
      queryClient.invalidateQueries({ queryKey: productionKeys.dood(projectId) });
    },
  });
}

export function useScheduleSceneStrip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { scene_id: string; shoot_day_id: string; order_index?: string }) =>
      productionApi.scheduleSceneStrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.schedule(projectId) });
      queryClient.invalidateQueries({ queryKey: productionKeys.dood(projectId) });
    },
  });
}

export function useAddBannerStrip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { shoot_day_id: string; banner_label: string; order_index?: string }) =>
      productionApi.addBannerStrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.schedule(projectId) });
    },
  });
}

export function useDeleteStrip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stripId: string) => productionApi.deleteStrip(stripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.schedule(projectId) });
      queryClient.invalidateQueries({ queryKey: productionKeys.dood(projectId) });
    },
  });
}

export function useUpdateDPR(shootDayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DPRIn) => productionApi.updateDPR(shootDayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionKeys.dpr(shootDayId) });
    },
  });
}
