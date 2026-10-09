"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studioApi } from "@/lib/api/studio";
import { Project, BackgroundJob } from "@/lib/types";

export const studioKeys = {
  all: ["projects"] as const,
  jobs: () => ["jobs"] as const,
};

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: studioKeys.all,
    queryFn: () => studioApi.getProjects(),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; slug?: string; aspect_ratio?: string; target_runtime_minutes?: number }) =>
      studioApi.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useBackgroundJobs(refetchInterval: number | false = 3000) {
  return useQuery<{ jobs: BackgroundJob[] }>({
    queryKey: studioKeys.jobs(),
    queryFn: () => studioApi.getBackgroundJobs(),
    refetchInterval,
  });
}
