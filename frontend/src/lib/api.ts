export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  aspect_ratio: string;
  target_runtime_minutes: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface SceneTreeNode {
  id: string;
  sequence_id?: string;
  scene_number: string;
  order_index: string;
  int_ext: 'INT' | 'EXT' | 'INT/EXT';
  set_name: string;
  time_of_day: string;
  pages_eighths: number;
  pages_display: string;
  estimated_shoot_minutes: number;
  synopsis: string;
  shot_count: number;
  take_count: number;
  circle_take_count: number;
}

export interface SequenceTreeNode {
  id: string;
  act_id: string;
  title: string;
  order_index: string;
  color_tag: string;
  dramatic_question: string;
  temp_score_reference: string;
  continuity_notes?: string;
  scenes: SceneTreeNode[];
}

export interface ActSequenceSummary {
  id: string;
  title: string;
  order_index: string;
  color_tag: string;
  dramatic_question: string;
  temp_score_reference: string;
  continuity_notes: string;
  scenes_count: number;
  pages_sum: number;
  shot_count: number;
  scenes: SceneTreeNode[];
}

export interface ActDetail {
  id: string;
  project_id: string;
  project_title: string;
  title: string;
  order_index: string;
  target_page_length: number;
  dramatic_milestone: string;
  total_scenes_count: number;
  actual_pages_sum: number;
  actual_pages_eighths: number;
  int_count: number;
  ext_count: number;
  day_count: number;
  night_count: number;
  total_planned_shots: number;
  total_shoot_minutes: number;
  sequences: ActSequenceSummary[];
}

export interface SequenceDetail {
  id: string;
  act_id: string;
  act_title: string;
  project_id: string;
  project_title: string;
  title: string;
  order_index: string;
  color_tag: string;
  dramatic_question: string;
  temp_score_reference: string;
  continuity_notes: string;
  scenes_count: number;
  pages_sum: number;
  total_planned_shots: number;
  scenes: SceneTreeNode[];
}

export interface ActTreeNode {
  id: string;
  project_id: string;
  title: string;
  order_index: string;
  target_page_length: number;
  dramatic_milestone: string;
  sequences: SequenceTreeNode[];
}

export interface ProjectTree {
  id: string;
  title: string;
  slug: string;
  aspect_ratio: string;
  target_runtime_minutes: number;
  acts: ActTreeNode[];
}

export interface ScriptBlock {
  id: string;
  type: 'slugline' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';
  content: string;
}

export interface SceneDetail {
  id: string;
  sequence_id?: string;
  sequence_title?: string;
  act_id?: string;
  act_title?: string;
  project_id?: string;
  scene_number: string;
  order_index: string;
  int_ext: 'INT' | 'EXT' | 'INT/EXT';
  set_name: string;
  time_of_day: string;
  pages_eighths: number;
  pages_display: string;
  estimated_shoot_minutes: number;
  script_data: {
    blocks?: ScriptBlock[];
    [key: string]: any;
  };
  synopsis: string;
  shot_count: number;
  take_count: number;
}

export interface Take {
  id: string;
  shot_id: string;
  take_number: number;
  is_circle_take: boolean;
  camera_card: string;
  sound_roll: string;
  timecode_in: string;
  timecode_out: string;
  script_supervisor_notes: string;
  created_at: string;
}

export interface Shot {
  id: string;
  setup_id: string;
  setup_code: string;
  shot_code: string;
  order_index: string;
  shot_size: string;
  focal_length: string;
  camera_movement: string;
  framing_description: string;
  storyboard_frame_url: string;
  covered_script_blocks: string[];
  takes: Take[];
}

export interface CameraSetup {
  id: string;
  scene_id: string;
  setup_code: string;
  lighting_package_notes: string;
  overhead_floorplan_url: string;
  shots: Shot[];
}

export interface SceneCoverage {
  scene_id: string;
  setups: CameraSetup[];
}

export interface SceneBreakdownItem {
  id: string;
  scene_id: string;
  element_type: 'PROP' | 'WARDROBE' | 'SOUND' | 'SFX' | 'VFX';
  prop_id?: string;
  prop_name?: string;
  costume_id?: string;
  costume_name?: string;
  custom_notes: string;
  is_continuity_critical: boolean;
}

export interface PropCatalogItem {
  id: string;
  name: string;
  is_hero_prop: boolean;
  quantity: number;
}

export interface CostumeLookCatalogItem {
  id: string;
  character_id: string;
  character_name: string;
  look_number: string;
  description: string;
  continuity_photo_url: string;
}

export interface CharacterCatalogItem {
  id: string;
  name: string;
  cast_id_number: number;
  actor_name: string;
  looks: CostumeLookCatalogItem[];
}

export interface MasterLocationCatalogItem {
  id: string;
  name: string;
  address: string;
  gps_coordinates: string;
  sun_path_notes: string;
}

export interface CatalogsResponse {
  characters: CharacterCatalogItem[];
  props: PropCatalogItem[];
  locations: MasterLocationCatalogItem[];
}

export interface LinkedSceneSummary {
  id: string;
  scene_number: string;
  int_ext: string;
  set_name: string;
  time_of_day: string;
  pages_display: string;
}

export interface MasterLocationDetail {
  id: string;
  name: string;
  address: string;
  gps_coordinates: string;
  sun_path_notes: string;
  linked_scenes_count: number;
  linked_scenes: LinkedSceneSummary[];
}

export interface CharacterDetail {
  id: string;
  name: string;
  cast_id_number: number;
  actor_name: string;
  looks: CostumeLookCatalogItem[];
  linked_scenes_count: number;
  dood_work_days: number;
}

export interface PropDetail {
  id: string;
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

export interface ProductionUnit {
  id: string;
  project_id: string;
  name: string;
}

export interface StripboardItem {
  id: string;
  shoot_day_id: string;
  order_index: string;
  item_type: 'SCENE' | 'BANNER';
  scene_id?: string;
  scene_number?: string;
  set_name?: string;
  int_ext?: string;
  time_of_day?: string;
  pages_display?: string;
  banner_label: string;
}

export interface StripboardItemDetail {
  id: string;
  shoot_day_id: string;
  order_index: string;
  item_type: 'SCENE' | 'BANNER';
  scene_id?: string;
  scene_number?: string;
  set_name?: string;
  int_ext?: string;
  time_of_day?: string;
  pages_eighths?: number;
  pages_display?: string;
  estimated_shoot_minutes?: number;
  banner_label: string;
  cast_ids: number[];
  has_stunts: boolean;
  has_vfx: boolean;
}

export interface ShootDay {
  id: string;
  day_number: number;
  calendar_date: string;
  general_crew_call?: string;
  shooting_call?: string;
  hospital_address: string;
  items: StripboardItem[];
}

export interface ShootDayDetail {
  id: string;
  unit_id: string;
  unit_name: string;
  day_number: number;
  calendar_date: string;
  general_crew_call?: string;
  shooting_call?: string;
  hospital_address: string;
  total_pages_display: string;
  total_pages_eighths: number;
  total_estimated_shoot_minutes: number;
  scene_count: number;
  items: StripboardItemDetail[];
}

export interface UnassignedScene {
  id: string;
  scene_number: string;
  int_ext: string;
  set_name: string;
  time_of_day: string;
  pages_eighths: number;
  pages_display: string;
  estimated_shoot_minutes: number;
  cast_ids: number[];
  has_stunts: boolean;
  has_vfx: boolean;
}

export interface ScheduleData {
  project_id: string;
  units: ProductionUnit[];
  shoot_days: ShootDayDetail[];
  unassigned_scenes: UnassignedScene[];
}

export interface DoodShootDay {
  id: string;
  day_number: number;
  calendar_date: string;
  total_working_actors: number;
}

export interface DoodCharacter {
  id: string;
  cast_id_number: number;
  name: string;
  actor_name: string;
  daily_status: Record<string, string>;
  total_work_days: number;
  total_hold_days: number;
  idle_ratio: number;
}

export interface DoodData {
  project_id: string;
  shoot_days: DoodShootDay[];
  characters: DoodCharacter[];
  total_cast_count: number;
  daily_working_summary: Record<string, number>;
}

export interface DPROut {
  id: string;
  shoot_day_id: string;
  actual_first_shot?: string;
  actual_wrap?: string;
  scenes_completed: number;
  pages_completed: number;
  camera_rolls_used: number;
  sound_rolls_used: number;
  delay_notes: string;
}

export interface DPRIn {
  actual_first_shot?: string;
  actual_wrap?: string;
  scenes_completed?: number;
  pages_completed?: number;
  camera_rolls_used?: number;
  sound_rolls_used?: number;
  delay_notes?: string;
}

export interface CrewMemberOut {
  id: string;
  project_id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
}

export interface CrewMemberIn {
  name: string;
  department: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface VfxShotOut {
  id: string;
  scene_id: string;
  vfx_id: string;
  status: string;
  description: string;
  frame_count: number;
  vendor_name: string;
}

export interface VfxShotIn {
  scene_id: string;
  vfx_id: string;
  status: string;
  description: string;
  frame_count?: number;
  vendor_name?: string;
}

export interface BudgetAccountOut {
  id: string;
  project_id: string;
  account_number: string;
  category: string;
  description: string;
}

export interface BudgetAccountIn {
  account_number: string;
  category: string;
  description: string;
}

export interface LineItemOut {
  id: string;
  account_id: string;
  description: string;
  amount: number;
  currency: string;
  is_actual: boolean;
}

export interface LineItemIn {
  description: string;
  amount: number;
  currency?: string;
  is_actual?: boolean;
}

export interface BudgetSummary {
  ATL: { estimated: number; actual: number };
  BTL_PRODUCTION: { estimated: number; actual: number };
  BTL_POST: { estimated: number; actual: number };
  OTHER: { estimated: number; actual: number };
  accounts: {
    id: string;
    account_number: string;
    category: string;
    description: string;
    estimated: number;
    actual: number;
  }[];
}

// ---------------------------------------------------------------------------
// FETCH HELPER
// ---------------------------------------------------------------------------

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData));
        } else {
            const errorText = await res.text();
            throw new Error(`HTTP Error ${res.status}: ${errorText.substring(0, 100)}...`);
        }
    }

    return res.json() as Promise<T>;
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch");
  }
}

// ---------------------------------------------------------------------------
// API METHODS
// ---------------------------------------------------------------------------

export const api = {
  // Studio
  getProjects: () => apiFetch<Project[]>("/studio/projects"),
  createProject: (payload: { title: string; slug?: string; aspect_ratio?: string; target_runtime_minutes?: number }) =>
    apiFetch<Project>("/studio/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    
  // Narrative
  getProjectTree: (projectId: string) => apiFetch<ProjectTree>(`/narrative/projects/${projectId}/tree`),
  importScript: (projectId: string, payload: { script_text: string }) => 
    apiFetch<{ message: string; scene_count: number }>(`/narrative/projects/${projectId}/import-script`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reorderScene: (payload: { scene_id: string; target_sequence_id?: string; new_order_index: string }) =>
    apiFetch<SceneTreeNode>("/narrative/scenes/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSceneDetail: (sceneId: string) => apiFetch<SceneDetail>(`/narrative/scenes/${sceneId}`),
  updateScene: (sceneId: string, payload: Partial<SceneDetail>) =>
    apiFetch<SceneDetail>(`/narrative/scenes/${sceneId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createScene: (payload: {
    sequence_id?: string;
    scene_number: string;
    set_name: string;
    int_ext: string;
    time_of_day: string;
    pages_eighths?: number;
    estimated_shoot_minutes?: number;
    synopsis?: string;
  }) =>
    apiFetch<SceneTreeNode>("/narrative/scenes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Acts
  getActDetail: (actId: string) => apiFetch<ActDetail>(`/narrative/acts/${actId}`),
  updateAct: (actId: string, payload: { title?: string; order_index?: string; target_page_length?: number; dramatic_milestone?: string }) =>
    apiFetch<ActDetail>(`/narrative/acts/${actId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createAct: (payload: { project_id: string; title: string; order_index?: string; target_page_length?: number; dramatic_milestone?: string }) =>
    apiFetch<ActTreeNode>("/narrative/acts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAct: (actId: string) =>
    apiFetch<{ success: boolean }>(`/narrative/acts/${actId}`, {
      method: "DELETE",
    }),

  // Sequences
  getSequenceDetail: (sequenceId: string) => apiFetch<SequenceDetail>(`/narrative/sequences/${sequenceId}`),
  updateSequence: (sequenceId: string, payload: { title?: string; order_index?: string; color_tag?: string; dramatic_question?: string; temp_score_reference?: string; continuity_notes?: string }) =>
    apiFetch<SequenceDetail>(`/narrative/sequences/${sequenceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createSequence: (payload: { act_id: string; title: string; order_index?: string; color_tag?: string; dramatic_question?: string; temp_score_reference?: string; continuity_notes?: string }) =>
    apiFetch<SequenceTreeNode>("/narrative/sequences", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteSequence: (sequenceId: string) =>
    apiFetch<{ success: boolean }>(`/narrative/sequences/${sequenceId}`, {
      method: "DELETE",
    }),

  // Shots & Coverage
  getSceneCoverage: (sceneId: string) => apiFetch<SceneCoverage>(`/shots/scenes/${sceneId}/coverage`),
  createSetup: (payload: { scene_id: string; setup_code: string; lighting_package_notes?: string; overhead_floorplan_url?: string }) =>
    apiFetch<CameraSetup>("/shots/setups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createShot: (payload: {
    setup_id: string;
    shot_code: string;
    order_index?: string;
    shot_size: string;
    focal_length: string;
    camera_movement: string;
    framing_description?: string;
    storyboard_frame_url?: string;
    covered_script_blocks?: string[];
  }) =>
    apiFetch<Shot>("/shots/shots", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateShot: (shotId: string, payload: Partial<Shot>) =>
    apiFetch<Shot>(`/shots/shots/${shotId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteShot: (shotId: string) =>
    apiFetch<{ success: boolean }>(`/shots/shots/${shotId}`, {
      method: "DELETE",
    }),
  createTake: (payload: {
    shot_id: string;
    take_number: number;
    is_circle_take?: boolean;
    camera_card?: string;
    sound_roll?: string;
    timecode_in?: string;
    timecode_out?: string;
    script_supervisor_notes?: string;
  }) =>
    apiFetch<Take>("/shots/takes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  toggleCircleTake: (takeId: string) =>
    apiFetch<Take>(`/shots/takes/${takeId}/toggle-circle`, {
      method: "PATCH",
    }),
  deleteTake: (takeId: string) =>
    apiFetch<{ success: boolean }>(`/shots/takes/${takeId}`, {
      method: "DELETE",
    }),

  // Breakdown
  getSceneBreakdownItems: (sceneId: string) => apiFetch<SceneBreakdownItem[]>(`/breakdown/scenes/${sceneId}/items`),
  runAiCopilot: (sceneId: string) => apiFetch<{ message: string }>(`/breakdown/scenes/${sceneId}/ai-copilot`, { method: "POST" }),
  addSceneBreakdownItem: (sceneId: string, payload: {
    element_type: string;
    prop_id?: string;
    costume_id?: string;
    custom_notes?: string;
    is_continuity_critical?: boolean;
  }) =>
    apiFetch<SceneBreakdownItem>(`/breakdown/scenes/${sceneId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteBreakdownItem: (itemId: string) =>
    apiFetch<{ success: boolean }>(`/breakdown/items/${itemId}`, {
      method: "DELETE",
    }),
  getCatalogs: (projectId: string) => apiFetch<CatalogsResponse>(`/breakdown/catalogs/${projectId}`),
  getBreakdownSummary: (projectId: string) => apiFetch<BreakdownSummary>(`/breakdown/projects/${projectId}/summary`),
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

  // Logistics & Scheduling
  getSchedule: (projectId: string) => apiFetch<ScheduleData>(`/logistics/projects/${projectId}/schedule`),
  generateCallSheet: (shootDayId: string) =>
    apiFetch<{ message: string }>(`/logistics/shoot-days/${shootDayId}/generate-call-sheet`, {
      method: "POST",
    }),
  createShootDay: (payload: { project_id?: string; unit_id?: string; day_number: number; calendar_date: string; general_crew_call?: string; shooting_call?: string; hospital_address?: string }) =>
    apiFetch<ShootDayDetail>("/logistics/shoot-days", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reorderStrip: (payload: { strip_id: string; target_shoot_day_id: string; new_order_index: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  scheduleSceneStrip: (payload: { scene_id: string; shoot_day_id: string; order_index?: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/schedule-scene", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addBannerStrip: (payload: { shoot_day_id: string; banner_label: string; order_index?: string }) =>
    apiFetch<StripboardItemDetail>("/logistics/strips/banner", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteStrip: (stripId: string) =>
    apiFetch<{ success: boolean }>(`/logistics/strips/${stripId}`, {
      method: "DELETE",
    }),
  getDoodMatrix: (projectId: string) => apiFetch<DoodData>(`/logistics/projects/${projectId}/dood`),
  getStripboard: (projectId: string) => apiFetch<ShootDay[]>(`/logistics/projects/${projectId}/stripboard`),
  getDPR: (shootDayId: string) => apiFetch<DPROut>(`/logistics/shoot-days/${shootDayId}/dpr`),
  updateDPR: (shootDayId: string, payload: DPRIn) =>
    apiFetch<DPROut>(`/logistics/shoot-days/${shootDayId}/dpr`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCrew: (projectId: string) => apiFetch<CrewMemberOut[]>(`/logistics/projects/${projectId}/crew`),
  createCrewMember: (projectId: string, payload: CrewMemberIn) =>
    apiFetch<CrewMemberOut>(`/logistics/projects/${projectId}/crew`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCrewMember: (crewId: string, payload: CrewMemberIn) =>
    apiFetch<CrewMemberOut>(`/logistics/crew/${crewId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCrewMember: (crewId: string) =>
    apiFetch<{ success: boolean }>(`/logistics/crew/${crewId}`, {
      method: "DELETE",
    }),
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
  getBudgetSummary: (projectId: string) => 
    apiFetch<BudgetSummary>(`/financials/projects/${projectId}/budget-summary`),
  createBudgetAccount: (projectId: string, payload: BudgetAccountIn) =>
    apiFetch<BudgetAccountOut>(`/financials/projects/${projectId}/accounts`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getLineItems: (accountId: string) => 
    apiFetch<LineItemOut[]>(`/financials/accounts/${accountId}/items`),
  createLineItem: (accountId: string, payload: LineItemIn) =>
    apiFetch<LineItemOut>(`/financials/accounts/${accountId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLineItem: (itemId: string, payload: LineItemIn) =>
    apiFetch<LineItemOut>(`/financials/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLineItem: (itemId: string) =>
    apiFetch<{ success: boolean }>(`/financials/items/${itemId}`, {
      method: "DELETE",
    }),

  // AI Agent
  uploadTempImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/ai/upload-temp-image`, {
      method: "POST",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Upload Failed: ${res.status}`);
      }
      return res.json() as Promise<{ image_url: string }>;
    });
  },
  sendChatMessage: (projectId: string, messages: {role: string, content: string, image_url?: string | null}[]) =>
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
};
