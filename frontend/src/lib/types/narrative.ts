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
  setup_count: number;
  shot_count: number;
  take_count: number;
  circle_take_count: number;
  camera_setups?: any[];
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

export interface ScriptBlock {
  id: string;
  type: string;
  content: string;
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
  continuity_notes?: string;
  scenes_count: number;
  pages_sum: number;
  actual_pages_eighths: number;
  shot_count: number;
  total_planned_shots?: number;
  scenes: SceneTreeNode[];
}

export interface SceneDetail {
  id: string;
  sequence_id: string;
  sequence_title: string;
  act_id: string;
  act_title: string;
  project_id: string;
  project_title: string;
  scene_number: string;
  order_index: string;
  int_ext: 'INT' | 'EXT' | 'INT/EXT';
  set_name: string;
  time_of_day: string;
  pages_eighths: number;
  pages_display: string;
  estimated_shoot_minutes: number;
  synopsis: string;
  script_text?: string;
  script_data?: {
    blocks?: ScriptBlock[];
    text?: string;
  };
  script_content?: string;
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
  aspect_ratio?: string;
  target_runtime_minutes?: number;
  acts: ActTreeNode[];
}
