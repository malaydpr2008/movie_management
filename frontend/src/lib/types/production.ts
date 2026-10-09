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
  setup_count?: number;
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
}

export interface ScheduleData {
  units: ProductionUnit[];
  shoot_days: ShootDayDetail[];
  unassigned_scenes: UnassignedScene[];
}

export interface CharacterDood {
  id?: string;
  cast_id: number;
  cast_id_number?: string | number;
  name: string;
  actor_name: string;
  daily_status: Record<string, string>;
  total_work_days: number;
  total_hold_days: number;
  idle_ratio?: number;
}

export interface DoodData {
  shoot_days: { id: string; day_number: number; calendar_date: string }[];
  characters: CharacterDood[];
  daily_working_summary?: any;
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
  phone: string;
  email: string;
  call_time_offset_minutes: number;
}

export interface CrewMemberIn {
  name: string;
  department: string;
  role: string;
  phone?: string;
  email?: string;
  call_time_offset_minutes?: number;
}
