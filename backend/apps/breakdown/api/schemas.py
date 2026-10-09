"""
Breakdown API Schemas.
"""
import uuid
from typing import Optional, List, Dict, Any
from ninja import Schema
from pydantic import Field


class LinkedSceneSummary(Schema):
    id: uuid.UUID
    scene_number: str
    int_ext: str
    set_name: str
    time_of_day: str
    pages_display: str


class PropOut(Schema):
    id: uuid.UUID
    name: str
    is_hero_prop: bool
    quantity: int


class PropDetailOut(Schema):
    id: uuid.UUID
    name: str
    is_hero_prop: bool
    quantity: int
    linked_scenes_count: int = 0
    linked_scenes: List[LinkedSceneSummary] = Field(default_factory=list)


class PropIn(Schema):
    project_id: uuid.UUID
    name: str
    is_hero_prop: bool = False
    quantity: int = 1


class PropUpdateIn(Schema):
    name: Optional[str] = None
    is_hero_prop: Optional[bool] = None
    quantity: Optional[int] = None


class CostumeLookOut(Schema):
    id: uuid.UUID
    character_id: uuid.UUID
    character_name: str
    look_number: str
    description: str
    continuity_photo_url: str


class CostumeLookIn(Schema):
    look_number: str = "Look 1"
    description: str = ""
    continuity_photo_url: str = ""


class CostumeLookUpdateIn(Schema):
    look_number: Optional[str] = None
    description: Optional[str] = None
    continuity_photo_url: Optional[str] = None


class CharacterOut(Schema):
    id: uuid.UUID
    name: str
    cast_id_number: int
    actor_name: str
    looks: List[CostumeLookOut] = Field(default_factory=list)


class CharacterDetailOut(Schema):
    id: uuid.UUID
    name: str
    cast_id_number: int
    actor_name: str
    looks: List[CostumeLookOut] = Field(default_factory=list)
    linked_scenes_count: int = 0
    dood_work_days: int = 0


class CharacterIn(Schema):
    project_id: uuid.UUID
    name: str
    cast_id_number: int
    actor_name: str = ""


class CharacterUpdateIn(Schema):
    name: Optional[str] = None
    cast_id_number: Optional[int] = None
    actor_name: Optional[str] = None


class MasterLocationOut(Schema):
    id: uuid.UUID
    name: str
    address: str
    gps_coordinates: str
    sun_path_notes: str


class MasterLocationDetailOut(Schema):
    id: uuid.UUID
    name: str
    address: str
    gps_coordinates: str
    sun_path_notes: str
    linked_scenes_count: int = 0
    linked_scenes: List[LinkedSceneSummary] = Field(default_factory=list)


class MasterLocationIn(Schema):
    project_id: uuid.UUID
    name: str
    address: str = ""
    gps_coordinates: str = ""
    sun_path_notes: str = ""


class MasterLocationUpdateIn(Schema):
    name: Optional[str] = None
    address: Optional[str] = None
    gps_coordinates: Optional[str] = None
    sun_path_notes: Optional[str] = None


class SceneBreakdownItemOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    element_type: str
    prop_id: Optional[uuid.UUID] = None
    prop_name: Optional[str] = None
    costume_id: Optional[uuid.UUID] = None
    costume_name: Optional[str] = None
    custom_notes: str
    is_continuity_critical: bool


class SceneBreakdownItemIn(Schema):
    element_type: str = "PROP"
    prop_id: Optional[uuid.UUID] = None
    costume_id: Optional[uuid.UUID] = None
    custom_notes: str = ""
    is_continuity_critical: bool = False


class VFXSFXItemOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    scene_number: str
    element_type: str
    custom_notes: str
    is_continuity_critical: bool


class BreakdownSummaryOut(Schema):
    total_locations: int
    total_characters: int
    total_props: int
    total_vfx: int
    total_sfx: int
    locations: List[MasterLocationDetailOut] = Field(default_factory=list)
    characters: List[CharacterDetailOut] = Field(default_factory=list)
    props: List[PropDetailOut] = Field(default_factory=list)
    vfx_sfx_items: List[VFXSFXItemOut] = Field(default_factory=list)


class VFXSfxItemOut(Schema):
    id: uuid.UUID
    element_type: str
    target: str
    custom_notes: str
    is_continuity_critical: bool
    scene_id: uuid.UUID


class CatalogsOut(Schema):
    characters: List[CharacterOut] = Field(default_factory=list)
    props: List[PropOut] = Field(default_factory=list)
    locations: List[MasterLocationOut] = Field(default_factory=list)


class ElementIn(Schema):
    category: str
    name: str
    description: str = ""
