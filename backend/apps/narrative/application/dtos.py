from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Set
import uuid

@dataclass(frozen=True)
class CreateSceneCommand:
    """Command DTO to create a new scene."""
    scene_number: str
    set_name: str
    sequence_id: Optional[uuid.UUID] = None
    order_index: str = "0|hzzzzz:"
    int_ext: str = "INT"
    time_of_day: str = "DAY"
    pages_eighths: int = 8
    estimated_shoot_minutes: int = 120
    script_data: Optional[Dict[str, Any]] = None
    synopsis: str = ""

@dataclass(frozen=True)
class UpdateSceneCommand:
    """Command DTO to partially update an existing scene."""
    scene_id: uuid.UUID
    sequence_id: Optional[uuid.UUID] = None
    scene_number: Optional[str] = None
    order_index: Optional[str] = None
    int_ext: Optional[str] = None
    set_name: Optional[str] = None
    time_of_day: Optional[str] = None
    pages_eighths: Optional[int] = None
    estimated_shoot_minutes: Optional[int] = None
    script_data: Optional[Dict[str, Any]] = None
    synopsis: Optional[str] = None
    updated_fields: Set[str] = field(default_factory=set)

@dataclass(frozen=True)
class ReorderSceneCommand:
    """Command DTO to reorder or reassign a scene to another sequence."""
    scene_id: uuid.UUID
    new_order_index: str
    target_sequence_id: Optional[uuid.UUID] = None

@dataclass(frozen=True)
class SceneDetailDTO:
    """Data transfer object representing detailed scene information with parent hierarchy and coverage."""
    id: uuid.UUID
    sequence_id: Optional[uuid.UUID]
    sequence_title: Optional[str]
    act_id: Optional[uuid.UUID]
    act_title: Optional[str]
    project_id: Optional[uuid.UUID]
    scene_number: str
    order_index: str
    int_ext: str
    set_name: str
    time_of_day: str
    pages_eighths: int
    pages_display: str
    estimated_shoot_minutes: int
    script_data: Dict[str, Any]
    synopsis: str
    setup_count: int = 0
    shot_count: int = 0
    take_count: int = 0

@dataclass(frozen=True)
class SceneTreeNodeDTO:
    """Data transfer object representing scene information in tree/outliner views."""
    id: uuid.UUID
    sequence_id: Optional[uuid.UUID]
    scene_number: str
    order_index: str
    int_ext: str
    set_name: str
    time_of_day: str
    pages_eighths: int
    pages_display: str
    estimated_shoot_minutes: int
    synopsis: str
    setup_count: int = 0
    shot_count: int = 0
    take_count: int = 0
    circle_take_count: int = 0
