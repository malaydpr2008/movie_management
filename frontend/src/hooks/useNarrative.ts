"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { narrativeApi } from "@/lib/api/narrative";
import {
  ProjectTree,
  ActDetail,
  SequenceDetail,
  SceneDetail,
} from "@/lib/types";

export const narrativeKeys = {
  all: ["narrative"] as const,
  tree: (projectId: string) => ["projectTree", projectId] as const,
  act: (actId: string) => ["actDetail", actId] as const,
  sequence: (sequenceId: string) => ["sequenceDetail", sequenceId] as const,
  scene: (sceneId: string) => ["sceneDetail", sceneId] as const,
};

export function useProjectTree(projectId: string) {
  return useQuery<ProjectTree>({
    queryKey: narrativeKeys.tree(projectId),
    queryFn: () => narrativeApi.getProjectTree(projectId),
    enabled: Boolean(projectId),
  });
}

export function useActDetail(actId: string) {
  return useQuery<ActDetail>({
    queryKey: narrativeKeys.act(actId),
    queryFn: () => narrativeApi.getActDetail(actId),
    enabled: Boolean(actId),
  });
}

export function useSequenceDetail(sequenceId: string) {
  return useQuery<SequenceDetail>({
    queryKey: narrativeKeys.sequence(sequenceId),
    queryFn: () => narrativeApi.getSequenceDetail(sequenceId),
    enabled: Boolean(sequenceId),
  });
}

export function useSceneDetail(sceneId: string) {
  return useQuery<SceneDetail>({
    queryKey: narrativeKeys.scene(sceneId),
    queryFn: () => narrativeApi.getSceneDetail(sceneId),
    enabled: Boolean(sceneId),
  });
}

export function useCreateScene(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      sequence_id?: string;
      scene_number: string;
      set_name: string;
      int_ext: string;
      time_of_day: string;
      pages_eighths?: number;
      estimated_shoot_minutes?: number;
      synopsis?: string;
    }) => narrativeApi.createScene(payload),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: narrativeKeys.tree(projectId) });
      }
      queryClient.invalidateQueries({ queryKey: narrativeKeys.all });
    },
  });
}

export function useUpdateScene(sceneId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<SceneDetail>) =>
      narrativeApi.updateScene(sceneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: narrativeKeys.scene(sceneId) });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: narrativeKeys.tree(projectId) });
      }
    },
  });
}

export function useReorderScene(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { scene_id: string; target_sequence_id?: string; new_order_index: string }) =>
      narrativeApi.reorderScene(payload),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: narrativeKeys.tree(projectId) });
      }
    },
  });
}

export function useDeleteAct(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actId: string) => narrativeApi.deleteAct(actId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: narrativeKeys.tree(projectId) });
      }
    },
  });
}

export function useDeleteSequence(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sequenceId: string) => narrativeApi.deleteSequence(sequenceId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: narrativeKeys.tree(projectId) });
      }
    },
  });
}
