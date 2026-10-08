import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

types_replacement = """export interface Take {
  id: string;
  shot_id: string;
  take_number: number;
  is_circle_take: boolean;
  duration_seconds?: number;
  director_notes: string;
  created_at: string;
}

export interface Shot {
  id: string;
  setup_id: string;
  shot_code: string;
  shot_size: string;
  lens?: string;
  description: string;
  vfx_required: boolean;
  created_at: string;
  takes: Take[];
}

export interface CameraSetup {
  id: string;
  scene_id: string;
  setup_code: string;
  camera_movement: string;
  equipment_notes: string;
  created_at?: string;
  shots: Shot[];
}"""

pattern = re.compile(r'export interface Take \{.*?export interface CameraSetup \{.*?\}', re.DOTALL)
text = pattern.sub(types_replacement, text)

endpoints_replacement = """  // Shots & Coverage
  getCameraTree: (projectId: string, sceneId: string) => apiFetch<SceneCoverage>(`/shots/scenes/${sceneId}/coverage`),
  createCameraSetup: (projectId: string, sceneId: string, payload: { setup_code: string; camera_movement: string; equipment_notes?: string }) =>
    apiFetch<CameraSetup>("/shots/setups", {
      method: "POST",
      body: JSON.stringify({ scene_id: sceneId, ...payload }),
    }),
  createShot: (projectId: string, sceneId: string, setupId: string, payload: { shot_code: string; shot_size: string; lens?: string; vfx_required?: boolean; description?: string }) =>
    apiFetch<Shot>("/shots/shots", {
      method: "POST",
      body: JSON.stringify({ setup_id: setupId, ...payload }),
    }),
  createTake: (projectId: string, sceneId: string, shotId: string, payload: { take_number: number; is_circle_take?: boolean }) =>
    apiFetch<Take>("/shots/takes", {
      method: "POST",
      body: JSON.stringify({ shot_id: shotId, ...payload }),
    }),
  toggleCircleTake: (takeId: string) =>
    apiFetch<Take>(`/shots/takes/${takeId}/toggle-circle`, {
      method: "PATCH",
    }),"""

pattern2 = re.compile(r'  // Shots & Coverage.*?toggleCircleTake: \(takeId: string\) =>.*?\}\),[\s\n]*deleteTake: \(takeId: string\) =>.*?\}\),', re.DOTALL)
text = pattern2.sub(endpoints_replacement, text)

with open('frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("api.ts successfully updated.")
