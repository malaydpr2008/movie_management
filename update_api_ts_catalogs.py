import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add VFXSfxItem interface if not present
vfx_type = """
export interface VFXSfxItem {
  id: string;
  element_type: string;
  target: string;
  custom_notes: string;
  is_continuity_critical: boolean;
  scene_id: string;
}
"""
if "export interface VFXSfxItem" not in text:
    text = text.replace("export interface SceneBreakdownItem {", vfx_type + "\nexport interface SceneBreakdownItem {")

catalog_funcs = """
  // Catalogs
  getProjectLocations: (projectId: string) => apiFetch<MasterLocation[]>(`/breakdown/projects/${projectId}/catalogs/locations`),
  getProjectCharacters: (projectId: string) => apiFetch<Character[]>(`/breakdown/projects/${projectId}/catalogs/characters`),
  getProjectProps: (projectId: string) => apiFetch<Prop[]>(`/breakdown/projects/${projectId}/catalogs/props`),
  getProjectVfx: (projectId: string) => apiFetch<VFXSfxItem[]>(`/breakdown/projects/${projectId}/catalogs/vfx`),
"""

if "getProjectLocations: (projectId: string)" not in text:
    text = text.replace("  // Catalogs", catalog_funcs)

with open('frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Added catalog functions to api.ts')
