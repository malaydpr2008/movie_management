import { apiFetch, apiUpload } from "./client";
import {
  ContinuityPhoto,
  MasterLocationDetail,
  CharacterDetail,
  PropDetail,
  VFXSFXItem,
  SceneBreakdownItem,
  CatalogsResponse,
  BreakdownSummary,
  CostumeLookCatalogItem,
} from "../types";

export const breakdownApi = {
  // Continuity Photos
  uploadContinuityPhoto: async (projectId: string, sceneId: string, file: File, category: string, description: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("description", description);
    return apiUpload<ContinuityPhoto>(`/breakdown/projects/${projectId}/scenes/${sceneId}/continuity-photos`, formData);
  },
  getContinuityPhotos: (sceneId: string) =>
    apiFetch<ContinuityPhoto[]>(`/breakdown/scenes/${sceneId}/continuity-photos`),
  toggleContinuityPhotoVerify: (photoId: string) =>
    apiFetch<ContinuityPhoto>(`/breakdown/continuity-photos/${photoId}/toggle-verify`, { method: "PATCH" }),

  // Catalogs
  getProjectLocations: (projectId: string) =>
    apiFetch<MasterLocationDetail[]>(`/breakdown/projects/${projectId}/catalogs/locations`),
  getProjectCharacters: (projectId: string) =>
    apiFetch<CharacterDetail[]>(`/breakdown/projects/${projectId}/catalogs/characters`),
  getProjectProps: (projectId: string) =>
    apiFetch<PropDetail[]>(`/breakdown/projects/${projectId}/catalogs/props`),
  getProjectVfx: (projectId: string) =>
    apiFetch<VFXSFXItem[]>(`/breakdown/projects/${projectId}/catalogs/vfx`),

  // Breakdown Items
  getSceneBreakdownItems: (sceneId: string) =>
    apiFetch<SceneBreakdownItem[]>(`/breakdown/scenes/${sceneId}/items`),
  runAiCopilot: (sceneId: string) =>
    apiFetch<{ message: string }>(`/breakdown/scenes/${sceneId}/ai-copilot`, { method: "POST" }),
  addSceneBreakdownItem: (
    sceneId: string,
    payload: {
      element_type: string;
      prop_id?: string;
      costume_id?: string;
      custom_notes?: string;
      is_continuity_critical?: boolean;
    }
  ) =>
    apiFetch<SceneBreakdownItem>(`/breakdown/scenes/${sceneId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteBreakdownItem: (itemId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/items/${itemId}`, {
      method: "DELETE",
    }),

  getCatalogs: (projectId: string) =>
    apiFetch<CatalogsResponse>(`/breakdown/catalogs/${projectId}`),
  getBreakdownSummary: (projectId: string) =>
    apiFetch<BreakdownSummary>(`/breakdown/projects/${projectId}/summary`),
  getSceneElements: (projectId: string, sceneId: string) =>
    apiFetch<{ elements: any[] }>(`/breakdown/projects/${projectId}/scenes/${sceneId}/elements`),
  createSceneElement: (projectId: string, sceneId: string, payload: { category: string; name: string; description?: string }) =>
    apiFetch<any>(`/breakdown/projects/${projectId}/scenes/${sceneId}/elements`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Locations CRUD
  createLocation: (payload: { project_id: string; name: string; address?: string; gps_coordinates?: string; sun_path_notes?: string }) =>
    apiFetch<MasterLocationDetail>("/breakdown/locations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLocation: (locationId: string, payload: Partial<MasterLocationDetail>) =>
    apiFetch<MasterLocationDetail>(`/breakdown/locations/${locationId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLocation: (locationId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/locations/${locationId}`, {
      method: "DELETE",
    }),

  // Characters CRUD
  createCharacter: (payload: { project_id: string; name: string; cast_id_number: number; actor_name?: string }) =>
    apiFetch<CharacterDetail>("/breakdown/characters", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCharacter: (characterId: string, payload: Partial<CharacterDetail>) =>
    apiFetch<CharacterDetail>(`/breakdown/characters/${characterId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCharacter: (characterId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/characters/${characterId}`, {
      method: "DELETE",
    }),

  // Costume Looks CRUD
  addCostumeLook: (characterId: string, payload: { look_number: string; description?: string; continuity_photo_url?: string }) =>
    apiFetch<CostumeLookCatalogItem>(`/breakdown/characters/${characterId}/looks`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCostumeLook: (lookId: string, payload: Partial<CostumeLookCatalogItem>) =>
    apiFetch<CostumeLookCatalogItem>(`/breakdown/looks/${lookId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCostumeLook: (lookId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/looks/${lookId}`, {
      method: "DELETE",
    }),

  // Props CRUD
  createProp: (payload: { project_id: string; name: string; is_hero_prop?: boolean; quantity?: number }) =>
    apiFetch<PropDetail>("/breakdown/props", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProp: (propId: string, payload: Partial<PropDetail>) =>
    apiFetch<PropDetail>(`/breakdown/props/${propId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteProp: (propId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/props/${propId}`, {
      method: "DELETE",
    }),
};
