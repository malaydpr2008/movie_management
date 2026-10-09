import { apiFetch, apiUpload } from "./client";
import { MediaAsset } from "../types";

export const mediaApi = {
  uploadMedia: async (appLabel: string, modelName: string, objectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<MediaAsset>(`/media/upload?app_label=${appLabel}&model_name=${modelName}&object_id=${objectId}`, formData);
  },
  getMediaAssets: (appLabel: string, modelName: string, objectId: string) =>
    apiFetch<MediaAsset[]>(`/media/${appLabel}/${modelName}/${objectId}`),
};
