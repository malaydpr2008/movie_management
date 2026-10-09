"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shotsApi } from "@/lib/api/shots";
import { SceneCoverage, VfxShotOut, VfxShotIn } from "@/lib/types";

export const shotsKeys = {
  all: ["shots"] as const,
  coverage: (sceneId: string) => ["sceneCoverage", sceneId] as const,
  vfx: (projectId: string) => ["vfx", projectId] as const,
};

export function useSceneCoverage(sceneId: string) {
  return useQuery<SceneCoverage>({
    queryKey: shotsKeys.coverage(sceneId),
    queryFn: () => shotsApi.getSceneCoverage(sceneId),
    enabled: Boolean(sceneId),
  });
}

export function useCreateSetup(sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { setup_code: string; equipment_notes?: string; lighting_package_notes?: string; camera_movement?: string }) =>
      shotsApi.createSetup({ scene_id: sceneId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.coverage(sceneId) });
    },
  });
}

export function useCreateShot(sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      setup_id: string;
      shot_code: string;
      shot_size: string;
      focal_length?: string;
      camera_movement?: string;
      framing_description?: string;
      storyboard_frame_url?: string;
      covered_script_blocks?: string[];
      vfx_required?: boolean;
      description?: string;
    }) => shotsApi.createShot(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.coverage(sceneId) });
    },
  });
}

export function useDeleteShot(sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shotId: string) => shotsApi.deleteShot(shotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.coverage(sceneId) });
    },
  });
}

export function useCreateTake(sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      shot_id: string;
      take_number: number;
      is_circle_take?: boolean;
      camera_card?: string;
      sound_roll?: string;
      timecode_in?: string;
      timecode_out?: string;
      script_supervisor_notes?: string;
    }) => shotsApi.createTake(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.coverage(sceneId) });
    },
  });
}

export function useToggleCircleTake(sceneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (takeId: string) => shotsApi.toggleCircleTake(takeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.coverage(sceneId) });
    },
  });
}

export function useVfxShots(projectId: string) {
  return useQuery<VfxShotOut[]>({
    queryKey: shotsKeys.vfx(projectId),
    queryFn: () => shotsApi.getVfxShots(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateVfxShot(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VfxShotIn) => shotsApi.createVfxShot(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shotsKeys.vfx(projectId) });
    },
  });
}
