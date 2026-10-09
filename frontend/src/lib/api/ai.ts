import { apiFetch, apiUpload } from "./client";
import { BackgroundJob, AssetFile } from "../types";

export const aiApi = {
  uploadTempImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<{ image_url: string }>("/ai/upload-temp-image", formData);
  },
  sendChatMessage: (projectId: string, messages: { role: string; content: string; image_url?: string | null }[]) =>
    apiFetch<{ reply: string }>(`/ai/projects/${projectId}/chat`, {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),
  getPendingBreakdown: (projectId: string) =>
    apiFetch<{ data: { scenes: any[] } | null }>(`/ai/projects/${projectId}/pending-breakdown`),
  approveBreakdown: (projectId: string, scenes: any[]) =>
    apiFetch<{ status: string }>(`/ai/projects/${projectId}/approve-breakdown`, {
      method: "POST",
      body: JSON.stringify({ scenes }),
    }),
  getBackgroundJobs: () =>
    apiFetch<{ jobs: BackgroundJob[] }>("/ai/jobs"),
  getAssets: () =>
    apiFetch<{ files: AssetFile[]; error?: string }>("/ai/assets"),
};
