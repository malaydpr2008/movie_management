export interface Take {
  id: string;
  shot_id: string;
  take_number: number;
  is_circle_take: boolean;
  camera_card?: string;
  sound_roll?: string;
  timecode_in?: string;
  timecode_out?: string;
  script_supervisor_notes?: string;
}

export interface Shot {
  id: string;
  setup_id: string;
  setup_code?: string;
  shot_code: string;
  shot_size: string;
  lens?: string;
  focal_length?: string;
  camera_movement?: string;
  framing_description?: string;
  storyboard_frame_url?: string;
  covered_script_blocks?: string[];
  vfx_required?: boolean;
  description?: string;
  takes: Take[];
}

export interface CameraSetup {
  id: string;
  scene_id: string;
  setup_code: string;
  camera_movement: string;
  equipment_notes?: string;
  lighting_package_notes?: string;
  shots: Shot[];
}

export interface SceneCoverage {
  scene_id: string;
  setups: CameraSetup[];
}

export interface VfxShotOut {
  id: string;
  vfx_id?: string;
  project_id: string;
  scene_id?: string;
  shot_id?: string;
  vendor_name?: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  description: string;
}

export interface VfxShotIn {
  project_id?: string;
  scene_id?: string;
  shot_id?: string;
  vendor_name?: string;
  status?: string;
  estimated_cost?: number;
  actual_cost?: number;
  description: string;
}
