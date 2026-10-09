export interface ContinuityPhoto {
  id: string;
  scene_id: string;
  file_url: string;
  category: 'HAIR_MAKEUP' | 'WARDROBE' | 'SET_DEC' | 'PROP';
  description: string;
  is_verified: boolean;
  uploaded_at: string;
}

export interface LinkedSceneSummary {
  id?: string;
  scene_id: string;
  scene_number: string;
  int_ext: string;
  set_name: string;
  time_of_day: string;
  pages_display?: string;
}

export interface MasterLocationDetail {
  id: string;
  project_id: string;
  name: string;
  address?: string;
  gps_coordinates?: string;
  sun_path_notes?: string;
  linked_scenes_count: number;
  linked_scenes: LinkedSceneSummary[];
}

export interface CostumeLookCatalogItem {
  id: string;
  character_id: string;
  look_number: string;
  description: string;
  continuity_photo_url?: string;
}

export interface CharacterDetail {
  id: string;
  project_id: string;
  name: string;
  cast_id_number: number;
  actor_name: string;
  costume_looks: CostumeLookCatalogItem[];
  looks?: CostumeLookCatalogItem[];
  dood_work_days?: number;
  linked_scenes_count: number;
  linked_scenes: LinkedSceneSummary[];
}

export interface PropDetail {
  id: string;
  project_id: string;
  name: string;
  is_hero_prop: boolean;
  quantity: number;
  linked_scenes_count: number;
  linked_scenes: LinkedSceneSummary[];
}

export interface VFXSFXItem {
  id: string;
  scene_id: string;
  scene_number: string;
  element_type: string;
  custom_notes: string;
  is_continuity_critical: boolean;
}

export type VFXSfxItem = VFXSFXItem;

export interface BreakdownSummary {
  total_locations: number;
  total_characters: number;
  total_props: number;
  total_vfx: number;
  total_sfx: number;
  locations: MasterLocationDetail[];
  characters: CharacterDetail[];
  props: PropDetail[];
  vfx_sfx_items: VFXSFXItem[];
}

export interface SceneBreakdownItem {
  id: string;
  scene_id: string;
  element_type: string;
  prop_id?: string;
  costume_id?: string;
  prop_name?: string;
  costume_name?: string;
  prop?: { id: string; name: string };
  costume_look?: { id: string; description: string };
  custom_notes: string;
  is_continuity_critical: boolean;
}

export interface CatalogsResponse {
  locations: MasterLocationDetail[];
  characters: CharacterDetail[];
  props: PropDetail[];
}
