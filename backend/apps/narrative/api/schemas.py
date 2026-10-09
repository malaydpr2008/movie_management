from typing import Optional, Dict, Any, List
import uuid
from ninja import Schema

class SceneTreeNode(Schema):
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

class SceneIn(Schema):
    sequence_id: Optional[uuid.UUID] = None
    scene_number: str
    order_index: Optional[str] = "0|hzzzzz:"
    int_ext: str = "INT"
    set_name: str
    time_of_day: str = "DAY"
    pages_eighths: int = 8
    estimated_shoot_minutes: int = 120
    script_data: Optional[Dict[str, Any]] = None
    synopsis: str = ""

class SceneUpdateIn(Schema):
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

class SceneReorderIn(Schema):
    scene_id: uuid.UUID
    target_sequence_id: Optional[uuid.UUID] = None
    new_order_index: str

class SceneDetailOut(Schema):
    id: uuid.UUID
    sequence_id: Optional[uuid.UUID]
    sequence_title: Optional[str] = None
    act_id: Optional[uuid.UUID] = None
    act_title: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
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
    shot_count: int
    take_count: int

class SequenceTreeNode(Schema):
    id: uuid.UUID
    act_id: uuid.UUID
    title: str
    order_index: str
    color_tag: str
    dramatic_question: str
    temp_score_reference: str
    continuity_notes: str = ""
    scenes: List[SceneTreeNode]

class ActTreeNode(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    order_index: str
    target_page_length: float
    dramatic_milestone: str
    sequences: List[SequenceTreeNode]

class ProjectTreeOut(Schema):
    id: uuid.UUID
    title: str
    slug: str
    aspect_ratio: str
    target_runtime_minutes: int
    acts: List[ActTreeNode]

class ActSequenceSummaryOut(Schema):
    id: uuid.UUID
    title: str
    order_index: str
    color_tag: str
    dramatic_question: str
    temp_score_reference: str
    continuity_notes: str = ""
    scenes_count: int
    pages_sum: float
    shot_count: int
    scenes: List[SceneTreeNode]

class ActDetailOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    project_title: str
    title: str
    order_index: str
    target_page_length: float
    dramatic_milestone: str
    total_scenes_count: int
    actual_pages_sum: float
    actual_pages_eighths: int
    int_count: int
    ext_count: int
    day_count: int
    night_count: int
    total_planned_shots: int
    total_shoot_minutes: int
    sequences: List[ActSequenceSummaryOut]

class ActUpdateIn(Schema):
    title: Optional[str] = None
    order_index: Optional[str] = None
    target_page_length: Optional[float] = None
    dramatic_milestone: Optional[str] = None

class ActIn(Schema):
    project_id: uuid.UUID
    title: str
    order_index: Optional[str] = "0|hzzzzz:"
    target_page_length: float = 30.0
    dramatic_milestone: str = ""

class SequenceDetailOut(Schema):
    id: uuid.UUID
    act_id: uuid.UUID
    act_title: str
    project_id: uuid.UUID
    project_title: str
    title: str
    order_index: str
    color_tag: str
    dramatic_question: str
    temp_score_reference: str
    continuity_notes: str
    scenes_count: int
    pages_sum: float
    total_planned_shots: int
    scenes: List[SceneTreeNode]

class SequenceUpdateIn(Schema):
    title: Optional[str] = None
    order_index: Optional[str] = None
    color_tag: Optional[str] = None
    dramatic_question: Optional[str] = None
    temp_score_reference: Optional[str] = None
    continuity_notes: Optional[str] = None

class SequenceIn(Schema):
    act_id: uuid.UUID
    title: str
    order_index: Optional[str] = "0|hzzzzz:"
    color_tag: str = "#3B82F6"
    dramatic_question: str = ""
    temp_score_reference: str = ""
    continuity_notes: Optional[str] = ""

class ScriptImportIn(Schema):
    script_text: str

class ADRCueOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    character_name: str
    line_text: str
    timecode: Optional[str] = None
    reason: str
    status: str
    created_at: Any

class ADRCueIn(Schema):
    character_name: str
    line_text: str
    timecode: Optional[str] = None
    reason: str

class ADRCueStatusIn(Schema):
    status: str

class StrictShotOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    shot_size: str
    camera_movement: str
    lens: Optional[str] = None
    description: str
    estimated_setup_time: int
    vfx_required: bool
    created_at: Any

class StrictShotIn(Schema):
    shot_size: str
    camera_movement: str
    lens: Optional[str] = None
    description: str
    estimated_setup_time: int = 15
    vfx_required: bool = False
