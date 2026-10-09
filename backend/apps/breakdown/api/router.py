"""
Breakdown API Router.
"""
import uuid
from typing import List, Dict, Any
from ninja import Router

from apps.breakdown.api.schemas import (
    ElementIn,
    SceneBreakdownItemOut,
    SceneBreakdownItemIn,
    MasterLocationOut,
    MasterLocationDetailOut,
    MasterLocationIn,
    MasterLocationUpdateIn,
    CharacterOut,
    CharacterDetailOut,
    CharacterIn,
    CharacterUpdateIn,
    CostumeLookOut,
    CostumeLookIn,
    CostumeLookUpdateIn,
    PropOut,
    PropDetailOut,
    PropIn,
    PropUpdateIn,
    BreakdownSummaryOut,
    VFXSfxItemOut,
    CatalogsOut,
)
from apps.breakdown.application.use_cases import (
    get_scene_elements as get_scene_elements_uc,
    add_scene_element as add_scene_element_uc,
    get_scene_breakdown_items as get_scene_breakdown_items_uc,
    add_scene_breakdown_item as add_scene_breakdown_item_uc,
    run_ai_copilot as run_ai_copilot_uc,
    delete_breakdown_item as delete_breakdown_item_uc,
    list_locations as list_locations_uc,
    create_location as create_location_uc,
    update_location as update_location_uc,
    delete_location as delete_location_uc,
    list_characters as list_characters_uc,
    create_character as create_character_uc,
    update_character as update_character_uc,
    delete_character as delete_character_uc,
    add_costume_look as add_costume_look_uc,
    update_costume_look as update_costume_look_uc,
    delete_costume_look as delete_costume_look_uc,
    list_props as list_props_uc,
    create_prop as create_prop_uc,
    update_prop as update_prop_uc,
    delete_prop as delete_prop_uc,
    get_breakdown_summary as get_breakdown_summary_uc,
    get_project_locations as get_project_locations_uc,
    get_project_characters as get_project_characters_uc,
    get_project_props as get_project_props_uc,
    get_project_vfx as get_project_vfx_uc,
    get_project_catalogs as get_project_catalogs_uc,
)

breakdown_router = Router(tags=["Breakdown Elements & Catalogs"])


@breakdown_router.get("/projects/{project_id}/scenes/{scene_id}/elements")
def get_scene_elements(request, project_id: uuid.UUID, scene_id: uuid.UUID):
    return get_scene_elements_uc(project_id, scene_id)


@breakdown_router.post("/projects/{project_id}/scenes/{scene_id}/elements")
def add_scene_element(request, project_id: uuid.UUID, scene_id: uuid.UUID, payload: ElementIn):
    return add_scene_element_uc(project_id, scene_id, payload)


@breakdown_router.get("/scenes/{scene_id}/items", response=List[SceneBreakdownItemOut])
def get_scene_breakdown_items(request, scene_id: uuid.UUID):
    return get_scene_breakdown_items_uc(scene_id)


@breakdown_router.post("/scenes/{scene_id}/items", response=SceneBreakdownItemOut)
def add_scene_breakdown_item(request, scene_id: uuid.UUID, payload: SceneBreakdownItemIn):
    return add_scene_breakdown_item_uc(scene_id, payload)


@breakdown_router.post("/scenes/{scene_id}/ai-copilot")
def run_ai_copilot_endpoint(request, scene_id: uuid.UUID):
    return run_ai_copilot_uc(scene_id)


@breakdown_router.delete("/items/{item_id}")
def delete_breakdown_item(request, item_id: uuid.UUID):
    return delete_breakdown_item_uc(item_id)


@breakdown_router.get("/locations", response=List[MasterLocationDetailOut])
def list_locations(request, project_id: uuid.UUID):
    return list_locations_uc(project_id)


@breakdown_router.post("/locations", response=MasterLocationDetailOut)
def create_location(request, payload: MasterLocationIn):
    return create_location_uc(payload)


@breakdown_router.patch("/locations/{location_id}", response=MasterLocationDetailOut)
def update_location(request, location_id: uuid.UUID, payload: MasterLocationUpdateIn):
    return update_location_uc(location_id, payload)


@breakdown_router.delete("/locations/{location_id}")
def delete_location(request, location_id: uuid.UUID):
    return delete_location_uc(location_id)


@breakdown_router.get("/characters", response=List[CharacterDetailOut])
def list_characters(request, project_id: uuid.UUID):
    return list_characters_uc(project_id)


@breakdown_router.post("/characters", response=CharacterDetailOut)
def create_character(request, payload: CharacterIn):
    return create_character_uc(payload)


@breakdown_router.patch("/characters/{character_id}", response=CharacterDetailOut)
def update_character(request, character_id: uuid.UUID, payload: CharacterUpdateIn):
    return update_character_uc(character_id, payload)


@breakdown_router.delete("/characters/{character_id}")
def delete_character(request, character_id: uuid.UUID):
    return delete_character_uc(character_id)


@breakdown_router.post("/characters/{character_id}/looks", response=CostumeLookOut)
def add_costume_look(request, character_id: uuid.UUID, payload: CostumeLookIn):
    return add_costume_look_uc(character_id, payload)


@breakdown_router.patch("/looks/{look_id}", response=CostumeLookOut)
def update_costume_look(request, look_id: uuid.UUID, payload: CostumeLookUpdateIn):
    return update_costume_look_uc(look_id, payload)


@breakdown_router.delete("/looks/{look_id}")
def delete_costume_look(request, look_id: uuid.UUID):
    return delete_costume_look_uc(look_id)


@breakdown_router.get("/props", response=List[PropDetailOut])
def list_props(request, project_id: uuid.UUID):
    return list_props_uc(project_id)


@breakdown_router.post("/props", response=PropDetailOut)
def create_prop(request, payload: PropIn):
    return create_prop_uc(payload)


@breakdown_router.patch("/props/{prop_id}", response=PropDetailOut)
def update_prop(request, prop_id: uuid.UUID, payload: PropUpdateIn):
    return update_prop_uc(prop_id, payload)


@breakdown_router.delete("/props/{prop_id}")
def delete_prop(request, prop_id: uuid.UUID):
    return delete_prop_uc(prop_id)


@breakdown_router.get("/projects/{project_id}/summary", response=BreakdownSummaryOut)
def get_breakdown_summary(request, project_id: uuid.UUID):
    return get_breakdown_summary_uc(project_id)


@breakdown_router.get("/projects/{project_id}/catalogs/locations", response=List[MasterLocationOut])
def get_project_locations(request, project_id: uuid.UUID):
    return get_project_locations_uc(project_id)


@breakdown_router.get("/projects/{project_id}/catalogs/characters", response=List[CharacterOut])
def get_project_characters(request, project_id: uuid.UUID):
    return get_project_characters_uc(project_id)


@breakdown_router.get("/projects/{project_id}/catalogs/props", response=List[PropOut])
def get_project_props(request, project_id: uuid.UUID):
    return get_project_props_uc(project_id)


@breakdown_router.get("/projects/{project_id}/catalogs/vfx", response=List[VFXSfxItemOut])
def get_project_vfx(request, project_id: uuid.UUID):
    return get_project_vfx_uc(project_id)


@breakdown_router.get("/catalogs/{project_id}", response=CatalogsOut)
def get_project_catalogs(request, project_id: uuid.UUID):
    return get_project_catalogs_uc(project_id)
