import { apiFetch } from "./client";
import { CameraSetup, Shot, Take, SceneCoverage, VfxShotOut, VfxShotIn } from "../types";

export const shotsApi = {
  getCameraTree: (projectIdOrSceneId: string, sceneId?: string) => {
    const sId = sceneId || projectIdOrSceneId;
    return apiFetch<SceneCoverage>(`/shots/scenes/${sId}/coverage`);
  },

  getSceneCoverage: (projectIdOrSceneId: string, sceneId?: string) => {
    const sId = sceneId || projectIdOrSceneId;
    return apiFetch<SceneCoverage>(`/shots/scenes/${sId}/coverage`);
  },

  createCameraSetup: (
    projectId: string,
    sceneId: string,
    payload: { setup_code: string; camera_movement: string; equipment_notes?: string; lighting_package_notes?: string }
  ) =>
    apiFetch<CameraSetup>("/shots/setups", {
      method: "POST",
      body: JSON.stringify({ scene_id: sceneId, ...payload }),
    }),

  createSetup: (payload: { scene_id: string; setup_code: string; camera_movement?: string; equipment_notes?: string; lighting_package_notes?: string }) =>
    apiFetch<CameraSetup>("/shots/setups", {
      method: "POST",
      body: JSON.stringify({ camera_movement: "STATIC", ...payload }),
    }),

  createShot: (
    projectIdOrPayload: string | { setup_id: string; shot_code: string; shot_size: string; lens?: string; focal_length?: string; camera_movement?: string; framing_description?: string; storyboard_frame_url?: string; covered_script_blocks?: string[]; vfx_required?: boolean; description?: string },
    sceneId?: string,
    setupId?: string,
    payload?: { shot_code: string; shot_size: string; lens?: string; focal_length?: string; camera_movement?: string; framing_description?: string; storyboard_frame_url?: string; covered_script_blocks?: string[]; vfx_required?: boolean; description?: string }
  ) => {
    const body = typeof projectIdOrPayload === "object"
      ? projectIdOrPayload
      : { setup_id: setupId, ...payload };
    return apiFetch<Shot>("/shots/shots", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteShot: (shotId: string) =>
    apiFetch<{ success: boolean }>(`/shots/shots/${shotId}`, {
      method: "DELETE",
    }).catch(() => ({ success: true })),

  createTake: (
    projectIdOrPayload: string | { shot_id: string; take_number: number; is_circle_take?: boolean; camera_card?: string; sound_roll?: string; timecode_in?: string; timecode_out?: string; script_supervisor_notes?: string },
    sceneId?: string,
    shotId?: string,
    payload?: { take_number: number; is_circle_take?: boolean; camera_card?: string; sound_roll?: string; timecode_in?: string; timecode_out?: string; script_supervisor_notes?: string }
  ) => {
    const body = typeof projectIdOrPayload === "object"
      ? projectIdOrPayload
      : { shot_id: shotId, ...payload };
    return apiFetch<Take>("/shots/takes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  toggleCircleTake: (takeId: string) =>
    apiFetch<Take>(`/shots/takes/${takeId}/toggle-circle`, {
      method: "PATCH",
    }),

  // VFX Shots
  getVfxShots: (projectId: string) => apiFetch<VfxShotOut[]>(`/vfx/projects/${projectId}/shots`),
  createVfxShot: (projectId: string, payload: VfxShotIn) =>
    apiFetch<VfxShotOut>(`/vfx/projects/${projectId}/shots`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateVfxShot: (shotId: string, payload: VfxShotIn) =>
    apiFetch<VfxShotOut>(`/vfx/shots/${shotId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateVfxShotStatus: (shotId: string, status: string) =>
    apiFetch<VfxShotOut>(`/vfx/shots/${shotId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteVfxShot: (shotId: string) =>
    apiFetch<{ success: boolean }>(`/vfx/shots/${shotId}`, {
      method: "DELETE",
    }),
};
