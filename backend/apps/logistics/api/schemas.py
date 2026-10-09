"""
Logistics API Schemas.
"""
import uuid
from typing import Optional, List, Dict, Any
from ninja import Schema
from pydantic import Field


class ProductionUnitOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str


class StripboardItemOut(Schema):
    id: uuid.UUID
    shoot_day_id: uuid.UUID
    order_index: str
    item_type: str
    scene_id: Optional[uuid.UUID] = None
    scene_number: Optional[str] = None
    set_name: Optional[str] = None
    int_ext: Optional[str] = None
    time_of_day: Optional[str] = None
    pages_display: Optional[str] = None
    banner_label: str


class StripboardItemDetailOut(Schema):
    id: uuid.UUID
    shoot_day_id: uuid.UUID
    order_index: str
    item_type: str
    scene_id: Optional[uuid.UUID] = None
    scene_number: Optional[str] = None
    set_name: Optional[str] = None
    int_ext: Optional[str] = None
    time_of_day: Optional[str] = None
    pages_eighths: Optional[int] = None
    pages_display: Optional[str] = None
    estimated_shoot_minutes: Optional[int] = None
    banner_label: str = ""
    cast_ids: List[int] = Field(default_factory=list)
    has_stunts: bool = False
    has_vfx: bool = False


class ShootDayOut(Schema):
    id: uuid.UUID
    day_number: int
    calendar_date: Any
    general_crew_call: Optional[Any] = None
    shooting_call: Optional[Any] = None
    hospital_address: str
    items: List[StripboardItemOut]


class ShootDayDetailOut(Schema):
    id: uuid.UUID
    unit_id: uuid.UUID
    unit_name: str
    day_number: int
    calendar_date: str
    general_crew_call: Optional[str] = None
    shooting_call: Optional[str] = None
    hospital_address: str = ""
    total_pages_display: str
    total_pages_eighths: int
    total_estimated_shoot_minutes: int
    scene_count: int
    items: List[StripboardItemDetailOut] = Field(default_factory=list)


class UnassignedSceneOut(Schema):
    id: uuid.UUID
    scene_number: str
    int_ext: str
    set_name: str
    time_of_day: str
    pages_eighths: int
    pages_display: str
    estimated_shoot_minutes: int
    cast_ids: List[int] = Field(default_factory=list)
    has_stunts: bool = False
    has_vfx: bool = False


class ScheduleOut(Schema):
    project_id: uuid.UUID
    units: List[ProductionUnitOut]
    shoot_days: List[ShootDayDetailOut]
    unassigned_scenes: List[UnassignedSceneOut]


class ShootDayCreateIn(Schema):
    project_id: Optional[uuid.UUID] = None
    unit_id: Optional[uuid.UUID] = None
    day_number: int
    calendar_date: str
    general_crew_call: Optional[str] = None
    shooting_call: Optional[str] = None
    hospital_address: str = ""


class StripReorderIn(Schema):
    strip_id: uuid.UUID
    target_shoot_day_id: uuid.UUID
    new_order_index: str


class StripScheduleSceneIn(Schema):
    scene_id: uuid.UUID
    shoot_day_id: uuid.UUID
    order_index: Optional[str] = "9999"


class StripBannerIn(Schema):
    shoot_day_id: uuid.UUID
    banner_label: str
    order_index: Optional[str] = "9999"


class DoodShootDay(Schema):
    id: uuid.UUID
    day_number: int
    calendar_date: str
    total_working_actors: int


class DoodCharacter(Schema):
    id: uuid.UUID
    cast_id_number: int
    name: str
    actor_name: str
    daily_status: Dict[str, str] = Field(default_factory=dict)
    total_work_days: int
    total_hold_days: int
    idle_ratio: float


class DoodMatrixOut(Schema):
    project_id: uuid.UUID
    shoot_days: List[DoodShootDay]
    characters: List[DoodCharacter]
    total_cast_count: int
    daily_working_summary: Dict[str, int]


class DPROut(Schema):
    id: uuid.UUID
    shoot_day_id: uuid.UUID
    actual_first_shot: Optional[str] = None
    actual_wrap: Optional[str] = None
    scenes_completed: int
    pages_completed: float
    camera_rolls_used: int
    sound_rolls_used: int
    delay_notes: str


class DPRIn(Schema):
    actual_first_shot: Optional[str] = None
    actual_wrap: Optional[str] = None
    scenes_completed: int = 0
    pages_completed: float = 0.0
    camera_rolls_used: int = 0
    sound_rolls_used: int = 0
    delay_notes: str = ""


class CrewMemberOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    department: str
    role: str
    email: str
    phone: str


class CrewMemberIn(Schema):
    name: str
    department: str
    role: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
