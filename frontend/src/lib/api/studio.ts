import { apiFetch } from "./client";
import { Project, BackgroundJob } from "../types";

export const studioApi = {
  getProjects: () => apiFetch<Project[]>("/studio/projects"),
  createProject: (payload: { title: string; slug?: string; aspect_ratio?: string; target_runtime_minutes?: number }) =>
    apiFetch<Project>("/studio/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getBackgroundJobs: () => apiFetch<{ jobs: BackgroundJob[] }>("/ai/jobs"),
};
