import re

with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add VFXSfxItem interface
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
  getProjectLocations: (projectId: string) => apiFetch<MasterLocationDetail[]>(`/breakdown/projects/${projectId}/catalogs/locations`),
  getProjectCharacters: (projectId: string) => apiFetch<CharacterDetail[]>(`/breakdown/projects/${projectId}/catalogs/characters`),
  getProjectProps: (projectId: string) => apiFetch<PropDetail[]>(`/breakdown/projects/${projectId}/catalogs/props`),
  getProjectVfx: (projectId: string) => apiFetch<VFXSfxItem[]>(`/breakdown/projects/${projectId}/catalogs/vfx`),
"""

# Insert at the end of the api object if not there
if "getProjectLocations:" not in text:
    # find the last closing brace of api object
    match = re.search(r',\s*// Universal Media Connector', text)
    if match:
        text = text.replace('  // Universal Media Connector', catalog_funcs + '\n  // Universal Media Connector')
    else:
        # just put it before the final '};'
        text = re.sub(r'};\s*$', catalog_funcs + '\n};', text)

with open('frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed api.ts')
