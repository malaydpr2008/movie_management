import uuid
from typing import List, Optional, Any, Dict
from django.shortcuts import get_object_or_404
from ninja import NinjaAPI, Router, Schema, File
from django.core.cache import cache
from ninja.files import UploadedFile
from pydantic import Field
import boto3
from django.conf import settings

from apps.narrative.models import Project, Act, Sequence, Scene
from apps.breakdown.models import MasterLocation, Character, CostumeLook, Prop, SceneBreakdownItem
from apps.shots.models import CameraSetup, Shot, Take, VfxShot
from apps.logistics.models import ProductionUnit, ShootDay, StripboardItem, DailyProductionReport, CrewMember
from apps.financials.models import BudgetAccount, LineItem
from apps.core.models import ProjectMembership, BackgroundJob
from apps.narrative.services import parse_fountain_script
from apps.logistics.tasks import generate_call_sheet_pdf
from apps.breakdown.ai_copilot import run_scene_breakdown

api = NinjaAPI(
    title="Movie Management Studio API",
    version="1.0.0",
    description="Dual-Tree Film Production and Screenplay Breakdown API Engine"
)

# ---------------------------------------------------------------------------
# SCHEMAS - Common & Narrative
# ---------------------------------------------------------------------------

class ProjectOut(Schema):
    id: uuid.UUID
    title: str
    slug: str
    aspect_ratio: str
    target_runtime_minutes: int
    created_at: Any

class ProjectCreateIn(Schema):
    title: str
    slug: Optional[str] = None
    status: Optional[str] = "PRE_PRODUCTION"
    aspect_ratio: str = "2.39:1"
    target_runtime_minutes: int = 120
    
    class Config:
        extra = "ignore"

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
    shot_count: int = 0
    take_count: int = 0
    circle_take_count: int = 0

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

class SceneReorderIn(Schema):
    scene_id: uuid.UUID
    target_sequence_id: Optional[uuid.UUID] = None
    new_order_index: str

class ActIn(Schema):
    project_id: uuid.UUID
    title: str
    order_index: Optional[str] = "0|hzzzzz:"
    target_page_length: float = 30.0
    dramatic_milestone: str = ""

class SequenceIn(Schema):
    act_id: uuid.UUID
    title: str
    order_index: Optional[str] = "0|hzzzzz:"
    color_tag: str = "#3B82F6"
    dramatic_question: str = ""
    temp_score_reference: str = ""
    continuity_notes: Optional[str] = ""

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
    shot_count: int
    take_count: int

# ---------------------------------------------------------------------------
# SCHEMAS - Shots & Coverage
# ---------------------------------------------------------------------------

class TakeOut(Schema):
    id: uuid.UUID
    shot_id: uuid.UUID
    take_number: int
    is_circle_take: bool
    camera_card: str
    sound_roll: str
    timecode_in: str
    timecode_out: str
    script_supervisor_notes: str
    created_at: Any

class ShotOut(Schema):
    id: uuid.UUID
    setup_id: uuid.UUID
    setup_code: str
    shot_code: str
    order_index: str
    shot_size: str
    focal_length: str
    camera_movement: str
    framing_description: str
    storyboard_frame_url: str
    covered_script_blocks: List[str]
    takes: List[TakeOut]

class CameraSetupOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    setup_code: str
    lighting_package_notes: str
    overhead_floorplan_url: str
    shots: List[ShotOut]

class SceneCoverageOut(Schema):
    scene_id: uuid.UUID
    setups: List[CameraSetupOut]

class CameraSetupIn(Schema):
    scene_id: uuid.UUID
    setup_code: str = "A"
    lighting_package_notes: str = ""
    overhead_floorplan_url: str = ""

class ShotIn(Schema):
    setup_id: uuid.UUID
    shot_code: str = "1"
    order_index: str = "0|hzzzzz:"
    shot_size: str = "MCU"
    focal_length: str = "35mm"
    camera_movement: str = "Static"
    framing_description: str = ""
    storyboard_frame_url: str = ""
    covered_script_blocks: List[str] = Field(default_factory=list)

class ShotUpdateIn(Schema):
    setup_id: Optional[uuid.UUID] = None
    shot_code: Optional[str] = None
    order_index: Optional[str] = None
    shot_size: Optional[str] = None
    focal_length: Optional[str] = None
    camera_movement: Optional[str] = None
    framing_description: Optional[str] = None
    storyboard_frame_url: Optional[str] = None
    covered_script_blocks: Optional[List[str]] = None

class TakeIn(Schema):
    shot_id: uuid.UUID
    take_number: int = 1
    is_circle_take: bool = False
    camera_card: str = "A001"
    sound_roll: str = "SR01"
    timecode_in: str = "01:00:00:00"
    timecode_out: str = "01:01:00:00"
    script_supervisor_notes: str = ""

# ---------------------------------------------------------------------------
# SCHEMAS - Breakdown
# ---------------------------------------------------------------------------

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

class CatalogsOut(Schema):
    characters: List[CharacterOut]
    props: List[PropOut]
    locations: List[MasterLocationOut]

# ---------------------------------------------------------------------------
# SCHEMAS - Logistics
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# ROUTER: STUDIO HUB
# ---------------------------------------------------------------------------

studio_router = Router(tags=["Studio Hub"])

@studio_router.get("/projects", response=List[ProjectOut])
def list_projects(request):
    return Project.objects.all()

@studio_router.post("/projects", response=ProjectOut)
def create_project(request, payload: ProjectCreateIn):
    try:
        slug = payload.slug or payload.title.lower().replace(" ", "-")
        # ensure unique slug
        base_slug = slug
        counter = 1
        while Project.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        project = Project.objects.create(
            title=payload.title,
            slug=slug,
            status=payload.status,
            aspect_ratio=payload.aspect_ratio,
            target_runtime_minutes=payload.target_runtime_minutes
        )
        if hasattr(request, 'user') and request.user.is_authenticated:
            ProjectMembership.objects.create(
                user=request.user,
                project=project,
                role='OWNER'
            )
        return project
    except Exception as e:
        from ninja.errors import HttpError
        raise HttpError(500, f"Failed to create project: {str(e)}")

# ---------------------------------------------------------------------------
# ROUTER: NARRATIVE
# ---------------------------------------------------------------------------

narrative_router = Router(tags=["Narrative Tree & Outline"])

class ScriptImportIn(Schema):
    script_text: str

@narrative_router.post("/projects/{project_id}/import-script", response=Dict[str, Any])
def import_script(request, project_id: uuid.UUID, payload: ScriptImportIn):
    scene_count = parse_fountain_script(project_id, payload.script_text)
    return {"message": "Script parsed successfully", "scene_count": scene_count}

@narrative_router.get("/projects/{project_id}/tree", response=ProjectTreeOut)
def get_project_tree(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    acts = project.acts.prefetch_related(
        'sequences__scenes__camera_setups__shots__takes'
    ).order_index_order() if hasattr(project.acts, 'order_index_order') else project.acts.order_by('order_index')

    acts_tree = []
    for act in acts:
        seqs_tree = []
        for seq in act.sequences.order_by('order_index'):
            scenes_tree = []
            for sc in seq.scenes.order_by('order_index'):
                shots = Shot.objects.filter(setup__scene=sc)
                shot_count = shots.count()
                take_count = Take.objects.filter(shot__setup__scene=sc).count()
                circle_take_count = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()
                scenes_tree.append(
                    SceneTreeNode(
                        id=sc.id,
                        sequence_id=seq.id,
                        scene_number=sc.scene_number,
                        order_index=sc.order_index,
                        int_ext=sc.int_ext,
                        set_name=sc.set_name,
                        time_of_day=sc.time_of_day,
                        pages_eighths=sc.pages_eighths,
                        pages_display=sc.pages_display,
                        estimated_shoot_minutes=sc.estimated_shoot_minutes,
                        synopsis=sc.synopsis,
                        shot_count=shot_count,
                        take_count=take_count,
                        circle_take_count=circle_take_count
                    )
                )
            seqs_tree.append(
                SequenceTreeNode(
                    id=seq.id,
                    act_id=act.id,
                    title=seq.title,
                    order_index=seq.order_index,
                    color_tag=seq.color_tag,
                    dramatic_question=seq.dramatic_question,
                    temp_score_reference=seq.temp_score_reference,
                    continuity_notes=getattr(seq, 'continuity_notes', '') or '',
                    scenes=scenes_tree
                )
            )
        acts_tree.append(
            ActTreeNode(
                id=act.id,
                project_id=project.id,
                title=act.title,
                order_index=act.order_index,
                target_page_length=act.target_page_length,
                dramatic_milestone=act.dramatic_milestone,
                sequences=seqs_tree
            )
        )

    return ProjectTreeOut(
        id=project.id,
        title=project.title,
        slug=project.slug,
        aspect_ratio=project.aspect_ratio,
        target_runtime_minutes=project.target_runtime_minutes,
        acts=acts_tree
    )

@narrative_router.post("/scenes/reorder", response=SceneTreeNode)
def reorder_scene(request, payload: SceneReorderIn):
    scene = get_object_or_404(Scene, id=payload.scene_id)
    if payload.target_sequence_id:
        target_seq = get_object_or_404(Sequence, id=payload.target_sequence_id)
        scene.sequence = target_seq
    scene.order_index = payload.new_order_index
    scene.save()

    shot_count = Shot.objects.filter(setup__scene=scene).count()
    take_count = Take.objects.filter(shot__setup__scene=scene).count()
    circle_take_count = Take.objects.filter(shot__setup__scene=scene, is_circle_take=True).count()

    return SceneTreeNode(
        id=scene.id,
        sequence_id=scene.sequence_id,
        scene_number=scene.scene_number,
        order_index=scene.order_index,
        int_ext=scene.int_ext,
        set_name=scene.set_name,
        time_of_day=scene.time_of_day,
        pages_eighths=scene.pages_eighths,
        pages_display=scene.pages_display,
        estimated_shoot_minutes=scene.estimated_shoot_minutes,
        synopsis=scene.synopsis,
        shot_count=shot_count,
        take_count=take_count,
        circle_take_count=circle_take_count
    )

@narrative_router.get("/scenes/{scene_id}", response=SceneDetailOut)
def get_scene_detail(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene.objects.select_related('sequence__act__project'), id=scene_id)
    shot_count = Shot.objects.filter(setup__scene=scene).count()
    take_count = Take.objects.filter(shot__setup__scene=scene).count()

    seq = scene.sequence
    act = seq.act if seq else None
    proj = act.project if act else None

    return SceneDetailOut(
        id=scene.id,
        sequence_id=seq.id if seq else None,
        sequence_title=seq.title if seq else None,
        act_id=act.id if act else None,
        act_title=act.title if act else None,
        project_id=proj.id if proj else None,
        scene_number=scene.scene_number,
        order_index=scene.order_index,
        int_ext=scene.int_ext,
        set_name=scene.set_name,
        time_of_day=scene.time_of_day,
        pages_eighths=scene.pages_eighths,
        pages_display=scene.pages_display,
        estimated_shoot_minutes=scene.estimated_shoot_minutes,
        script_data=scene.script_data or {},
        synopsis=scene.synopsis,
        shot_count=shot_count,
        take_count=take_count
    )

@narrative_router.patch("/scenes/{scene_id}", response=SceneDetailOut)
def update_scene(request, scene_id: uuid.UUID, payload: SceneUpdateIn):
    scene = get_object_or_404(Scene.objects.select_related('sequence__act__project'), id=scene_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if field == 'sequence_id' and val is not None:
            scene.sequence = get_object_or_404(Sequence, id=val)
        else:
            setattr(scene, field, val)
    scene.save()
    return get_scene_detail(request, scene_id)

@narrative_router.get("/acts/{act_id}", response=ActDetailOut)
def get_act_detail(request, act_id: uuid.UUID):
    act = get_object_or_404(Act.objects.select_related('project').prefetch_related('sequences__scenes'), id=act_id)
    sequences = act.sequences.order_by('order_index')

    total_scenes = 0
    actual_pages_eighths = 0
    int_count = 0
    ext_count = 0
    day_count = 0
    night_count = 0
    total_shoot_minutes = 0
    total_planned_shots = 0

    seqs_out = []
    for seq in sequences:
        scenes = seq.scenes.order_by('order_index')
        seq_scenes_out = []
        seq_eighths = 0
        seq_shots = 0

        for sc in scenes:
            sc_shots = Shot.objects.filter(setup__scene=sc).count()
            sc_takes = Take.objects.filter(shot__setup__scene=sc).count()
            sc_circle = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()

            total_scenes += 1
            actual_pages_eighths += sc.pages_eighths
            seq_eighths += sc.pages_eighths
            total_shoot_minutes += sc.estimated_shoot_minutes
            total_planned_shots += sc_shots
            seq_shots += sc_shots

            if sc.int_ext == 'INT':
                int_count += 1
            elif sc.int_ext == 'EXT':
                ext_count += 1
            else:
                int_count += 1
                ext_count += 1

            if 'night' in sc.time_of_day.lower():
                night_count += 1
            else:
                day_count += 1

            seq_scenes_out.append(
                SceneTreeNode(
                    id=sc.id,
                    sequence_id=seq.id,
                    scene_number=sc.scene_number,
                    order_index=sc.order_index,
                    int_ext=sc.int_ext,
                    set_name=sc.set_name,
                    time_of_day=sc.time_of_day,
                    pages_eighths=sc.pages_eighths,
                    pages_display=sc.pages_display,
                    estimated_shoot_minutes=sc.estimated_shoot_minutes,
                    synopsis=sc.synopsis,
                    shot_count=sc_shots,
                    take_count=sc_takes,
                    circle_take_count=sc_circle,
                )
            )

        seqs_out.append(
            ActSequenceSummaryOut(
                id=seq.id,
                title=seq.title,
                order_index=seq.order_index,
                color_tag=seq.color_tag,
                dramatic_question=seq.dramatic_question,
                temp_score_reference=seq.temp_score_reference,
                continuity_notes=getattr(seq, 'continuity_notes', '') or '',
                scenes_count=len(scenes),
                pages_sum=round(seq_eighths / 8.0, 2),
                shot_count=seq_shots,
                scenes=seq_scenes_out,
            )
        )

    return ActDetailOut(
        id=act.id,
        project_id=act.project.id,
        project_title=act.project.title,
        title=act.title,
        order_index=act.order_index,
        target_page_length=act.target_page_length,
        dramatic_milestone=act.dramatic_milestone,
        total_scenes_count=total_scenes,
        actual_pages_sum=round(actual_pages_eighths / 8.0, 2),
        actual_pages_eighths=actual_pages_eighths,
        int_count=int_count,
        ext_count=ext_count,
        day_count=day_count,
        night_count=night_count,
        total_planned_shots=total_planned_shots,
        total_shoot_minutes=total_shoot_minutes,
        sequences=seqs_out,
    )

@narrative_router.patch("/acts/{act_id}", response=ActDetailOut)
def update_act(request, act_id: uuid.UUID, payload: ActUpdateIn):
    act = get_object_or_404(Act, id=act_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(act, field, val)
    act.save()
    return get_act_detail(request, act_id)

@narrative_router.post("/acts", response=ActTreeNode)
def create_act(request, payload: ActIn):
    project = get_object_or_404(Project, id=payload.project_id)
    act = Act.objects.create(
        project=project,
        title=payload.title,
        order_index=payload.order_index,
        target_page_length=payload.target_page_length,
        dramatic_milestone=payload.dramatic_milestone
    )
    return ActTreeNode(
        id=act.id,
        project_id=project.id,
        title=act.title,
        order_index=act.order_index,
        target_page_length=act.target_page_length,
        dramatic_milestone=act.dramatic_milestone,
        sequences=[]
    )

@narrative_router.delete("/acts/{act_id}")
def delete_act(request, act_id: uuid.UUID):
    act = get_object_or_404(Act, id=act_id)
    act.delete()
    return {"success": True}

@narrative_router.get("/sequences/{sequence_id}", response=SequenceDetailOut)
def get_sequence_detail(request, sequence_id: uuid.UUID):
    seq = get_object_or_404(
        Sequence.objects.select_related('act__project').prefetch_related('scenes'),
        id=sequence_id
    )
    scenes = seq.scenes.order_by('order_index')

    total_eighths = 0
    total_shots = 0
    scenes_out = []

    for sc in scenes:
        sc_shots = Shot.objects.filter(setup__scene=sc).count()
        sc_takes = Take.objects.filter(shot__setup__scene=sc).count()
        sc_circle = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()

        total_eighths += sc.pages_eighths
        total_shots += sc_shots

        scenes_out.append(
            SceneTreeNode(
                id=sc.id,
                sequence_id=seq.id,
                scene_number=sc.scene_number,
                order_index=sc.order_index,
                int_ext=sc.int_ext,
                set_name=sc.set_name,
                time_of_day=sc.time_of_day,
                pages_eighths=sc.pages_eighths,
                pages_display=sc.pages_display,
                estimated_shoot_minutes=sc.estimated_shoot_minutes,
                synopsis=sc.synopsis,
                shot_count=sc_shots,
                take_count=sc_takes,
                circle_take_count=sc_circle,
            )
        )

    act = seq.act
    proj = act.project

    return SequenceDetailOut(
        id=seq.id,
        act_id=act.id,
        act_title=act.title,
        project_id=proj.id,
        project_title=proj.title,
        title=seq.title,
        order_index=seq.order_index,
        color_tag=seq.color_tag,
        dramatic_question=seq.dramatic_question,
        temp_score_reference=seq.temp_score_reference,
        continuity_notes=getattr(seq, 'continuity_notes', '') or '',
        scenes_count=len(scenes),
        pages_sum=round(total_eighths / 8.0, 2),
        total_planned_shots=total_shots,
        scenes=scenes_out,
    )

@narrative_router.patch("/sequences/{sequence_id}", response=SequenceDetailOut)
def update_sequence(request, sequence_id: uuid.UUID, payload: SequenceUpdateIn):
    seq = get_object_or_404(Sequence, id=sequence_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(seq, field, val)
    seq.save()
    return get_sequence_detail(request, sequence_id)

@narrative_router.post("/sequences", response=SequenceTreeNode)
def create_sequence(request, payload: SequenceIn):
    act = get_object_or_404(Act, id=payload.act_id)
    seq = Sequence.objects.create(
        act=act,
        title=payload.title,
        order_index=payload.order_index,
        color_tag=payload.color_tag,
        dramatic_question=payload.dramatic_question,
        temp_score_reference=payload.temp_score_reference,
        continuity_notes=payload.continuity_notes or ''
    )
    return SequenceTreeNode(
        id=seq.id,
        act_id=act.id,
        title=seq.title,
        order_index=seq.order_index,
        color_tag=seq.color_tag,
        dramatic_question=seq.dramatic_question,
        temp_score_reference=seq.temp_score_reference,
        continuity_notes=getattr(seq, 'continuity_notes', '') or '',
        scenes=[]
    )

@narrative_router.delete("/sequences/{sequence_id}")
def delete_sequence(request, sequence_id: uuid.UUID):
    seq = get_object_or_404(Sequence, id=sequence_id)
    seq.delete()
    return {"success": True}

@narrative_router.post("/scenes", response=SceneTreeNode)
def create_scene(request, payload: SceneIn):
    seq = get_object_or_404(Sequence, id=payload.sequence_id) if payload.sequence_id else None
    scene = Scene.objects.create(
        sequence=seq,
        scene_number=payload.scene_number,
        order_index=payload.order_index or "0|hzzzzz:",
        int_ext=payload.int_ext,
        set_name=payload.set_name,
        time_of_day=payload.time_of_day,
        pages_eighths=payload.pages_eighths,
        estimated_shoot_minutes=payload.estimated_shoot_minutes,
        script_data=payload.script_data or {},
        synopsis=payload.synopsis
    )
    return SceneTreeNode(
        id=scene.id,
        sequence_id=scene.sequence_id,
        scene_number=scene.scene_number,
        order_index=scene.order_index,
        int_ext=scene.int_ext,
        set_name=scene.set_name,
        time_of_day=scene.time_of_day,
        pages_eighths=scene.pages_eighths,
        pages_display=scene.pages_display,
        estimated_shoot_minutes=scene.estimated_shoot_minutes,
        synopsis=scene.synopsis,
        shot_count=0,
        take_count=0,
        circle_take_count=0
    )

@narrative_router.delete("/scenes/{scene_id}")
def delete_scene(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id)
    scene.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# ROUTER: SHOTS & COVERAGE
# ---------------------------------------------------------------------------

shots_router = Router(tags=["Shots & Coverage"])

@shots_router.get("/scenes/{scene_id}/coverage", response=SceneCoverageOut)
def get_scene_coverage(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id)
    setups = CameraSetup.objects.filter(scene=scene).prefetch_related('shots__takes').order_by('setup_code')
    setups_out = []
    for setup in setups:
        shots_out = []
        for shot in setup.shots.order_by('order_index', 'shot_code'):
            takes_out = [
                TakeOut(
                    id=take.id,
                    shot_id=shot.id,
                    take_number=take.take_number,
                    is_circle_take=take.is_circle_take,
                    camera_card=take.camera_card,
                    sound_roll=take.sound_roll,
                    timecode_in=take.timecode_in,
                    timecode_out=take.timecode_out,
                    script_supervisor_notes=take.script_supervisor_notes,
                    created_at=take.created_at
                )
                for take in shot.takes.order_by('take_number')
            ]
            shots_out.append(
                ShotOut(
                    id=shot.id,
                    setup_id=setup.id,
                    setup_code=setup.setup_code,
                    shot_code=shot.shot_code,
                    order_index=shot.order_index,
                    shot_size=shot.shot_size,
                    focal_length=shot.focal_length,
                    camera_movement=shot.camera_movement,
                    framing_description=shot.framing_description,
                    storyboard_frame_url=shot.storyboard_frame_url,
                    covered_script_blocks=shot.covered_script_blocks or [],
                    takes=takes_out
                )
            )
        setups_out.append(
            CameraSetupOut(
                id=setup.id,
                scene_id=scene.id,
                setup_code=setup.setup_code,
                lighting_package_notes=setup.lighting_package_notes,
                overhead_floorplan_url=setup.overhead_floorplan_url,
                shots=shots_out
            )
        )
    return SceneCoverageOut(scene_id=scene.id, setups=setups_out)

@shots_router.post("/setups", response=CameraSetupOut)
def create_setup(request, payload: CameraSetupIn):
    scene = get_object_or_404(Scene, id=payload.scene_id)
    setup = CameraSetup.objects.create(
        scene=scene,
        setup_code=payload.setup_code.upper(),
        lighting_package_notes=payload.lighting_package_notes,
        overhead_floorplan_url=payload.overhead_floorplan_url
    )
    return CameraSetupOut(
        id=setup.id,
        scene_id=scene.id,
        setup_code=setup.setup_code,
        lighting_package_notes=setup.lighting_package_notes,
        overhead_floorplan_url=setup.overhead_floorplan_url,
        shots=[]
    )

@shots_router.post("/shots", response=ShotOut)
def create_shot(request, payload: ShotIn):
    setup = get_object_or_404(CameraSetup, id=payload.setup_id)
    shot = Shot.objects.create(
        setup=setup,
        shot_code=payload.shot_code,
        order_index=payload.order_index,
        shot_size=payload.shot_size,
        focal_length=payload.focal_length,
        camera_movement=payload.camera_movement,
        framing_description=payload.framing_description,
        storyboard_frame_url=payload.storyboard_frame_url,
        covered_script_blocks=payload.covered_script_blocks
    )
    return ShotOut(
        id=shot.id,
        setup_id=setup.id,
        setup_code=setup.setup_code,
        shot_code=shot.shot_code,
        order_index=shot.order_index,
        shot_size=shot.shot_size,
        focal_length=shot.focal_length,
        camera_movement=shot.camera_movement,
        framing_description=shot.framing_description,
        storyboard_frame_url=shot.storyboard_frame_url,
        covered_script_blocks=shot.covered_script_blocks or [],
        takes=[]
    )

@shots_router.patch("/shots/{shot_id}", response=ShotOut)
def update_shot(request, shot_id: uuid.UUID, payload: ShotUpdateIn):
    shot = get_object_or_404(Shot.objects.select_related('setup'), id=shot_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if field == 'setup_id' and val is not None:
            shot.setup = get_object_or_404(CameraSetup, id=val)
        else:
            setattr(shot, field, val)
    shot.save()

    takes_out = [
        TakeOut(
            id=t.id,
            shot_id=shot.id,
            take_number=t.take_number,
            is_circle_take=t.is_circle_take,
            camera_card=t.camera_card,
            sound_roll=t.sound_roll,
            timecode_in=t.timecode_in,
            timecode_out=t.timecode_out,
            script_supervisor_notes=t.script_supervisor_notes,
            created_at=t.created_at
        )
        for t in shot.takes.order_by('take_number')
    ]

    return ShotOut(
        id=shot.id,
        setup_id=shot.setup.id,
        setup_code=shot.setup.setup_code,
        shot_code=shot.shot_code,
        order_index=shot.order_index,
        shot_size=shot.shot_size,
        focal_length=shot.focal_length,
        camera_movement=shot.camera_movement,
        framing_description=shot.framing_description,
        storyboard_frame_url=shot.storyboard_frame_url,
        covered_script_blocks=shot.covered_script_blocks or [],
        takes=takes_out
    )

@shots_router.delete("/shots/{shot_id}")
def delete_shot(request, shot_id: uuid.UUID):
    shot = get_object_or_404(Shot, id=shot_id)
    shot.delete()
    return {"success": True}

@shots_router.post("/takes", response=TakeOut)
def create_take(request, payload: TakeIn):
    shot = get_object_or_404(Shot, id=payload.shot_id)
    take = Take.objects.create(
        shot=shot,
        take_number=payload.take_number,
        is_circle_take=payload.is_circle_take,
        camera_card=payload.camera_card,
        sound_roll=payload.sound_roll,
        timecode_in=payload.timecode_in,
        timecode_out=payload.timecode_out,
        script_supervisor_notes=payload.script_supervisor_notes
    )
    return TakeOut(
        id=take.id,
        shot_id=shot.id,
        take_number=take.take_number,
        is_circle_take=take.is_circle_take,
        camera_card=take.camera_card,
        sound_roll=take.sound_roll,
        timecode_in=take.timecode_in,
        timecode_out=take.timecode_out,
        script_supervisor_notes=take.script_supervisor_notes,
        created_at=take.created_at
    )

@shots_router.patch("/takes/{take_id}/toggle-circle", response=TakeOut)
def toggle_circle_take(request, take_id: uuid.UUID):
    take = get_object_or_404(Take, id=take_id)
    take.is_circle_take = not take.is_circle_take
    take.save()
    return TakeOut(
        id=take.id,
        shot_id=take.shot_id,
        take_number=take.take_number,
        is_circle_take=take.is_circle_take,
        camera_card=take.camera_card,
        sound_roll=take.sound_roll,
        timecode_in=take.timecode_in,
        timecode_out=take.timecode_out,
        script_supervisor_notes=take.script_supervisor_notes,
        created_at=take.created_at
    )

@shots_router.delete("/takes/{take_id}")
def delete_take(request, take_id: uuid.UUID):
    take = get_object_or_404(Take, id=take_id)
    take.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# ROUTER: BREAKDOWN
# ---------------------------------------------------------------------------

breakdown_router = Router(tags=["Breakdown Elements & Catalogs"])

def _format_pages_eighths(total_eighths: int) -> str:
    whole = total_eighths // 8
    rem = total_eighths % 8
    if whole > 0 and rem > 0:
        return f"{whole} {rem}/8 pgs"
    elif rem > 0:
        return f"{rem}/8 pgs"
    elif whole > 0:
        return f"{whole} pgs"
    else:
        return "0 pgs"

def _get_project_char_map(project: Project) -> Dict[str, int]:
    chars = Character.objects.filter(project=project)
    mapping = {}
    for c in chars:
        mapping[c.name.strip().upper()] = c.cast_id_number
        # Also map first name if multi-word
        parts = c.name.strip().upper().split()
        if len(parts) > 1 and len(parts[0]) > 2:
            mapping[parts[0]] = c.cast_id_number
    return mapping

def _get_scene_cast_ids(scene: Scene, char_map: Dict[str, int]) -> List[int]:
    cast_ids = set()
    for item in scene.breakdown_items.all():
        if item.costume and item.costume.character:
            cast_ids.add(item.costume.character.cast_id_number)
    
    script_data = scene.script_data or {}
    blocks = script_data.get('blocks', [])
    for b in blocks:
        if b.get('type') == 'character':
            raw_name = b.get('content', '').strip().upper()
            if raw_name in char_map:
                cast_ids.add(char_map[raw_name])
            else:
                for c_key, c_num in char_map.items():
                    if raw_name == c_key or raw_name in c_key.split():
                        cast_ids.add(c_num)
                        break

    return sorted(list(cast_ids))

def _scene_flags(scene: Scene):
    has_stunts = False
    has_vfx = False
    for item in scene.breakdown_items.all():
        if item.element_type == 'SFX':
            has_stunts = True
        elif item.element_type == 'VFX':
            has_vfx = True
        notes = (item.custom_notes or '').lower()
        if any(w in notes for w in ['stunt', 'wire', 'explosion', 'fire', 'fall', 'fight', 'crash']):
            has_stunts = True
    return has_stunts, has_vfx

@breakdown_router.get("/scenes/{scene_id}/items", response=List[SceneBreakdownItemOut])
def get_scene_breakdown_items(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id)
    items = scene.breakdown_items.select_related('prop', 'costume__character').all()
    results = []
    for item in items:
        results.append(
            SceneBreakdownItemOut(
                id=item.id,
                scene_id=scene.id,
                element_type=item.element_type,
                prop_id=item.prop.id if item.prop else None,
                prop_name=item.prop.name if item.prop else None,
                costume_id=item.costume.id if item.costume else None,
                costume_name=f"{item.costume.character.name} - {item.costume.look_number}" if item.costume else None,
                custom_notes=item.custom_notes,
                is_continuity_critical=item.is_continuity_critical
            )
        )
    return results

@breakdown_router.post("/scenes/{scene_id}/items", response=SceneBreakdownItemOut)
def add_scene_breakdown_item(request, scene_id: uuid.UUID, payload: SceneBreakdownItemIn):
    scene = get_object_or_404(Scene, id=scene_id)
    prop = get_object_or_404(Prop, id=payload.prop_id) if payload.prop_id else None
    costume = get_object_or_404(CostumeLook, id=payload.costume_id) if payload.costume_id else None

    item = SceneBreakdownItem.objects.create(
        scene=scene,
        element_type=payload.element_type,
        prop=prop,
        costume=costume,
        custom_notes=payload.custom_notes,
        is_continuity_critical=payload.is_continuity_critical
    )
    return SceneBreakdownItemOut(
        id=item.id,
        scene_id=scene.id,
        element_type=item.element_type,
        prop_id=prop.id if prop else None,
        prop_name=prop.name if prop else None,
        costume_id=costume.id if costume else None,
        costume_name=f"{costume.character.name} - {costume.look_number}" if costume else None,
        custom_notes=item.custom_notes,
        is_continuity_critical=item.is_continuity_critical
    )

@breakdown_router.post("/scenes/{scene_id}/ai-copilot")
def run_ai_copilot_endpoint(request, scene_id: uuid.UUID):
    from apps.narrative.tasks import batch_script_breakdown
    scene = get_object_or_404(Scene.objects.select_related('sequence__act__project'), id=scene_id)
    project_id = str(scene.sequence.act.project.id) if scene.sequence and scene.sequence.act else None
    if not project_id and hasattr(scene, 'project_id'):
        project_id = str(scene.project_id)
        
    # Extract text from script_data blocks if available
    script_text = ""
    if scene.script_data and "blocks" in scene.script_data:
        script_text = "\n".join([b.get("content", "") for b in scene.script_data["blocks"]])
    elif scene.script_data and "text" in scene.script_data:
        script_text = scene.script_data["text"]
    else:
        script_text = f"{scene.int_ext} {scene.set_name} - {scene.time_of_day}\n(No script text available)"
        
    batch_script_breakdown.delay(project_id, script_text)
    return {"message": "Breakdown dispatched to background workers."}

@breakdown_router.delete("/items/{item_id}")
def delete_breakdown_item(request, item_id: uuid.UUID):
    item = get_object_or_404(SceneBreakdownItem, id=item_id)
    item.delete()
    return {"success": True}

# --- MASTER LOCATIONS CRUD ---

def _build_location_detail(loc: MasterLocation) -> MasterLocationDetailOut:
    # Query linked scenes by FK or by set name matching
    scenes = list(loc.scenes.all().order_by('order_index'))
    if not scenes:
        # Fallback keyword match
        keywords = [w for w in loc.name.split() if len(w) > 4]
        if keywords:
            from django.db.models import Q
            q_obj = Q()
            for kw in keywords:
                q_obj |= Q(set_name__icontains=kw)
            scenes = list(Scene.objects.filter(sequence__act__project=loc.project).filter(q_obj).order_by('order_index'))
    
    linked_summaries = [
        LinkedSceneSummary(
            id=sc.id,
            scene_number=sc.scene_number,
            int_ext=sc.int_ext,
            set_name=sc.set_name,
            time_of_day=sc.time_of_day,
            pages_display=sc.pages_display
        )
        for sc in scenes
    ]
    return MasterLocationDetailOut(
        id=loc.id,
        name=loc.name,
        address=loc.address,
        gps_coordinates=loc.gps_coordinates,
        sun_path_notes=loc.sun_path_notes,
        linked_scenes_count=len(linked_summaries),
        linked_scenes=linked_summaries
    )

@breakdown_router.get("/locations", response=List[MasterLocationDetailOut])
def list_locations(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    locs = MasterLocation.objects.filter(project=project).prefetch_related('scenes')
    return [_build_location_detail(loc) for loc in locs]

@breakdown_router.post("/locations", response=MasterLocationDetailOut)
def create_location(request, payload: MasterLocationIn):
    project = get_object_or_404(Project, id=payload.project_id)
    loc = MasterLocation.objects.create(
        project=project,
        name=payload.name,
        address=payload.address,
        gps_coordinates=payload.gps_coordinates,
        sun_path_notes=payload.sun_path_notes
    )
    return _build_location_detail(loc)

@breakdown_router.patch("/locations/{location_id}", response=MasterLocationDetailOut)
def update_location(request, location_id: uuid.UUID, payload: MasterLocationUpdateIn):
    loc = get_object_or_404(MasterLocation, id=location_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(loc, field, val)
    loc.save()
    return _build_location_detail(loc)

@breakdown_router.delete("/locations/{location_id}")
def delete_location(request, location_id: uuid.UUID):
    loc = get_object_or_404(MasterLocation, id=location_id)
    loc.delete()
    return {"success": True}

# --- CHARACTERS & COSTUMES CRUD ---

def _build_character_detail(c: Character, project: Project) -> CharacterDetailOut:
    looks_out = [
        CostumeLookOut(
            id=lk.id,
            character_id=c.id,
            character_name=c.name,
            look_number=lk.look_number,
            description=lk.description,
            continuity_photo_url=lk.continuity_photo_url
        )
        for lk in c.costume_looks.all()
    ]
    # Count scenes where character is tagged
    scenes = Scene.objects.filter(
        sequence__act__project=project
    ).filter(
        breakdown_items__costume__character=c
    ).distinct()
    linked_scenes_count = scenes.count()
    if linked_scenes_count == 0:
        # Check script mentions
        char_name = c.name.strip().upper()
        all_scenes = Scene.objects.filter(sequence__act__project=project)
        for sc in all_scenes:
            blocks = (sc.script_data or {}).get('blocks', [])
            if any(b.get('type') == 'character' and char_name in b.get('content', '').upper() for b in blocks):
                linked_scenes_count += 1

    # Estimate DooD work days from scheduled shoot days
    dood_days = ShootDay.objects.filter(
        unit__project=project,
        stripboard_items__scene__in=scenes
    ).distinct().count()

    return CharacterDetailOut(
        id=c.id,
        name=c.name,
        cast_id_number=c.cast_id_number,
        actor_name=c.actor_name,
        looks=looks_out,
        linked_scenes_count=linked_scenes_count,
        dood_work_days=dood_days
    )

@breakdown_router.get("/characters", response=List[CharacterDetailOut])
def list_characters(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    chars = Character.objects.filter(project=project).prefetch_related('costume_looks').order_by('cast_id_number')
    return [_build_character_detail(c, project) for c in chars]

@breakdown_router.post("/characters", response=CharacterDetailOut)
def create_character(request, payload: CharacterIn):
    project = get_object_or_404(Project, id=payload.project_id)
    c = Character.objects.create(
        project=project,
        name=payload.name,
        cast_id_number=payload.cast_id_number,
        actor_name=payload.actor_name
    )
    return _build_character_detail(c, project)

@breakdown_router.patch("/characters/{character_id}", response=CharacterDetailOut)
def update_character(request, character_id: uuid.UUID, payload: CharacterUpdateIn):
    c = get_object_or_404(Character.objects.select_related('project'), id=character_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(c, field, val)
    c.save()
    return _build_character_detail(c, c.project)

@breakdown_router.delete("/characters/{character_id}")
def delete_character(request, character_id: uuid.UUID):
    c = get_object_or_404(Character, id=character_id)
    c.delete()
    return {"success": True}

@breakdown_router.post("/characters/{character_id}/looks", response=CostumeLookOut)
def add_costume_look(request, character_id: uuid.UUID, payload: CostumeLookIn):
    c = get_object_or_404(Character, id=character_id)
    look = CostumeLook.objects.create(
        character=c,
        look_number=payload.look_number,
        description=payload.description,
        continuity_photo_url=payload.continuity_photo_url
    )
    return CostumeLookOut(
        id=look.id,
        character_id=c.id,
        character_name=c.name,
        look_number=look.look_number,
        description=look.description,
        continuity_photo_url=look.continuity_photo_url
    )

@breakdown_router.patch("/looks/{look_id}", response=CostumeLookOut)
def update_costume_look(request, look_id: uuid.UUID, payload: CostumeLookUpdateIn):
    look = get_object_or_404(CostumeLook.objects.select_related('character'), id=look_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(look, field, val)
    look.save()
    return CostumeLookOut(
        id=look.id,
        character_id=look.character.id,
        character_name=look.character.name,
        look_number=look.look_number,
        description=look.description,
        continuity_photo_url=look.continuity_photo_url
    )

@breakdown_router.delete("/looks/{look_id}")
def delete_costume_look(request, look_id: uuid.UUID):
    look = get_object_or_404(CostumeLook, id=look_id)
    look.delete()
    return {"success": True}

# --- PROPS CRUD ---

def _build_prop_detail(p: Prop, project: Project) -> PropDetailOut:
    items = SceneBreakdownItem.objects.filter(prop=p).select_related('scene')
    linked_summaries = [
        LinkedSceneSummary(
            id=it.scene.id,
            scene_number=it.scene.scene_number,
            int_ext=it.scene.int_ext,
            set_name=it.scene.set_name,
            time_of_day=it.scene.time_of_day,
            pages_display=it.scene.pages_display
        )
        for it in items
    ]
    return PropDetailOut(
        id=p.id,
        name=p.name,
        is_hero_prop=p.is_hero_prop,
        quantity=p.quantity,
        linked_scenes_count=len(linked_summaries),
        linked_scenes=linked_summaries
    )

@breakdown_router.get("/props", response=List[PropDetailOut])
def list_props(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    props = Prop.objects.filter(project=project)
    return [_build_prop_detail(p, project) for p in props]

@breakdown_router.post("/props", response=PropDetailOut)
def create_prop(request, payload: PropIn):
    project = get_object_or_404(Project, id=payload.project_id)
    p = Prop.objects.create(
        project=project,
        name=payload.name,
        is_hero_prop=payload.is_hero_prop,
        quantity=payload.quantity
    )
    return _build_prop_detail(p, project)

@breakdown_router.patch("/props/{prop_id}", response=PropDetailOut)
def update_prop(request, prop_id: uuid.UUID, payload: PropUpdateIn):
    p = get_object_or_404(Prop.objects.select_related('project'), id=prop_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(p, field, val)
    p.save()
    return _build_prop_detail(p, p.project)

@breakdown_router.delete("/props/{prop_id}")
def delete_prop(request, prop_id: uuid.UUID):
    p = get_object_or_404(Prop, id=prop_id)
    p.delete()
    return {"success": True}

# --- CENTRAL BREAKDOWN SUMMARY ---

@breakdown_router.get("/projects/{project_id}/summary", response=BreakdownSummaryOut)
def get_breakdown_summary(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    locs = MasterLocation.objects.filter(project=project).prefetch_related('scenes')
    locations_out = [_build_location_detail(loc) for loc in locs]

    chars = Character.objects.filter(project=project).prefetch_related('costume_looks').order_by('cast_id_number')
    characters_out = [_build_character_detail(c, project) for c in chars]

    props = Prop.objects.filter(project=project)
    props_out = [_build_prop_detail(p, project) for p in props]

    # VFX / SFX items
    vfx_sfx = SceneBreakdownItem.objects.filter(
        scene__sequence__act__project=project,
        element_type__in=['VFX', 'SFX']
    ).select_related('scene')

    vfx_sfx_out = [
        VFXSFXItemOut(
            id=item.id,
            scene_id=item.scene.id,
            scene_number=item.scene.scene_number,
            element_type=item.element_type,
            custom_notes=item.custom_notes,
            is_continuity_critical=item.is_continuity_critical
        )
        for item in vfx_sfx
    ]

    total_vfx = sum(1 for item in vfx_sfx if item.element_type == 'VFX')
    total_sfx = sum(1 for item in vfx_sfx if item.element_type == 'SFX')

    return BreakdownSummaryOut(
        total_locations=len(locations_out),
        total_characters=len(characters_out),
        total_props=len(props_out),
        total_vfx=total_vfx,
        total_sfx=total_sfx,
        locations=locations_out,
        characters=characters_out,
        props=props_out,
        vfx_sfx_items=vfx_sfx_out
    )

@breakdown_router.get("/catalogs/{project_id}", response=CatalogsOut)
def get_project_catalogs(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    chars = Character.objects.filter(project=project).prefetch_related('costume_looks')
    characters_out = []
    for c in chars:
        looks_out = [
            CostumeLookOut(
                id=lk.id,
                character_id=c.id,
                character_name=c.name,
                look_number=lk.look_number,
                description=lk.description,
                continuity_photo_url=lk.continuity_photo_url
            )
            for lk in c.costume_looks.all()
        ]
        characters_out.append(
            CharacterOut(
                id=c.id,
                name=c.name,
                cast_id_number=c.cast_id_number,
                actor_name=c.actor_name,
                looks=looks_out
            )
        )

    props = Prop.objects.filter(project=project)
    props_out = [
        PropOut(id=p.id, name=p.name, is_hero_prop=p.is_hero_prop, quantity=p.quantity)
        for p in props
    ]

    locs = MasterLocation.objects.filter(project=project)
    locs_out = [
        MasterLocationOut(
            id=loc.id,
            name=loc.name,
            address=loc.address,
            gps_coordinates=loc.gps_coordinates,
            sun_path_notes=loc.sun_path_notes
        )
        for loc in locs
    ]

    return CatalogsOut(
        characters=characters_out,
        props=props_out,
        locations=locs_out
    )

# ---------------------------------------------------------------------------
# ROUTER: LOGISTICS
# ---------------------------------------------------------------------------

logistics_router = Router(tags=["Logistics & Stripboard"])

@logistics_router.post("/shoot-days/{shoot_day_id}/generate-call-sheet", response=Dict[str, Any])
def generate_call_sheet(request, shoot_day_id: uuid.UUID):
    # Trigger Celery task
    generate_call_sheet_pdf.delay(str(shoot_day_id))
    return {"message": "Call Sheet generation queued in background."}

@logistics_router.get("/projects/{project_id}/schedule", response=ScheduleOut)
def get_project_schedule(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    char_map = _get_project_char_map(project)

    units = list(ProductionUnit.objects.filter(project=project))
    units_out = [
        ProductionUnitOut(id=u.id, project_id=project.id, name=u.name)
        for u in units
    ]

    shoot_days = ShootDay.objects.filter(unit__project=project).select_related('unit').prefetch_related(
        'stripboard_items__scene__breakdown_items__costume__character'
    ).order_by('day_number')

    scheduled_scene_ids = set()
    days_out = []

    for day in shoot_days:
        day_items = list(day.stripboard_items.all().order_by('order_index', 'created_at'))
        items_out = []
        total_eighths = 0
        total_minutes = 0
        scene_count = 0

        for it in day_items:
            sc = it.scene
            cast_ids = []
            has_stunts = False
            has_vfx = False
            if sc:
                scheduled_scene_ids.add(sc.id)
                scene_count += 1
                total_eighths += sc.pages_eighths
                total_minutes += sc.estimated_shoot_minutes
                cast_ids = _get_scene_cast_ids(sc, char_map)
                has_stunts, has_vfx = _scene_flags(sc)

            items_out.append(
                StripboardItemDetailOut(
                    id=it.id,
                    shoot_day_id=day.id,
                    order_index=it.order_index,
                    item_type=it.item_type,
                    scene_id=sc.id if sc else None,
                    scene_number=sc.scene_number if sc else None,
                    set_name=sc.set_name if sc else None,
                    int_ext=sc.int_ext if sc else None,
                    time_of_day=sc.time_of_day if sc else None,
                    pages_eighths=sc.pages_eighths if sc else None,
                    pages_display=sc.pages_display if sc else None,
                    estimated_shoot_minutes=sc.estimated_shoot_minutes if sc else None,
                    banner_label=it.banner_label or "",
                    cast_ids=cast_ids,
                    has_stunts=has_stunts,
                    has_vfx=has_vfx
                )
            )

        days_out.append(
            ShootDayDetailOut(
                id=day.id,
                unit_id=day.unit.id,
                unit_name=day.unit.name,
                day_number=day.day_number,
                calendar_date=str(day.calendar_date),
                general_crew_call=str(day.general_crew_call)[:5] if day.general_crew_call else None,
                shooting_call=str(day.shooting_call)[:5] if day.shooting_call else None,
                hospital_address=day.hospital_address or "",
                total_pages_display=_format_pages_eighths(total_eighths),
                total_pages_eighths=total_eighths,
                total_estimated_shoot_minutes=total_minutes,
                scene_count=scene_count,
                items=items_out
            )
        )

    # Calculate unassigned scenes
    all_scenes = Scene.objects.filter(
        sequence__act__project=project
    ).prefetch_related('breakdown_items__costume__character').order_by('order_index')

    unassigned_scenes_out = []
    for sc in all_scenes:
        if sc.id not in scheduled_scene_ids:
            cast_ids = _get_scene_cast_ids(sc, char_map)
            has_stunts, has_vfx = _scene_flags(sc)
            unassigned_scenes_out.append(
                UnassignedSceneOut(
                    id=sc.id,
                    scene_number=sc.scene_number,
                    int_ext=sc.int_ext,
                    set_name=sc.set_name,
                    time_of_day=sc.time_of_day,
                    pages_eighths=sc.pages_eighths,
                    pages_display=sc.pages_display,
                    estimated_shoot_minutes=sc.estimated_shoot_minutes,
                    cast_ids=cast_ids,
                    has_stunts=has_stunts,
                    has_vfx=has_vfx
                )
            )

    return ScheduleOut(
        project_id=project.id,
        units=units_out,
        shoot_days=days_out,
        unassigned_scenes=unassigned_scenes_out
    )

@logistics_router.post("/shoot-days", response=ShootDayDetailOut)
def create_shoot_day(request, payload: ShootDayCreateIn):
    if payload.unit_id:
        unit = get_object_or_404(ProductionUnit, id=payload.unit_id)
    elif payload.project_id:
        project = get_object_or_404(Project, id=payload.project_id)
        unit = ProductionUnit.objects.filter(project=project).first()
        if not unit:
            unit = ProductionUnit.objects.create(project=project, name="Main Unit")
    else:
        return {"error": "Either unit_id or project_id must be provided"}

    day = ShootDay.objects.create(
        unit=unit,
        day_number=payload.day_number,
        calendar_date=payload.calendar_date,
        general_crew_call=payload.general_crew_call,
        shooting_call=payload.shooting_call,
        hospital_address=payload.hospital_address
    )
    return ShootDayDetailOut(
        id=day.id,
        unit_id=unit.id,
        unit_name=unit.name,
        day_number=day.day_number,
        calendar_date=str(day.calendar_date),
        general_crew_call=str(day.general_crew_call)[:5] if day.general_crew_call else None,
        shooting_call=str(day.shooting_call)[:5] if day.shooting_call else None,
        hospital_address=day.hospital_address or "",
        total_pages_display="0 pgs",
        total_pages_eighths=0,
        total_estimated_shoot_minutes=0,
        scene_count=0,
        items=[]
    )

@logistics_router.post("/strips/reorder", response=StripboardItemDetailOut)
def reorder_strip(request, payload: StripReorderIn):
    strip = get_object_or_404(StripboardItem.objects.select_related('shoot_day', 'scene'), id=payload.strip_id)
    target_day = get_object_or_404(ShootDay, id=payload.target_shoot_day_id)

    strip.shoot_day = target_day
    strip.order_index = payload.new_order_index
    strip.save()

    sc = strip.scene
    cast_ids = []
    has_stunts = False
    has_vfx = False
    if sc:
        char_map = _get_project_char_map(target_day.unit.project)
        cast_ids = _get_scene_cast_ids(sc, char_map)
        has_stunts, has_vfx = _scene_flags(sc)

    return StripboardItemDetailOut(
        id=strip.id,
        shoot_day_id=target_day.id,
        order_index=strip.order_index,
        item_type=strip.item_type,
        scene_id=sc.id if sc else None,
        scene_number=sc.scene_number if sc else None,
        set_name=sc.set_name if sc else None,
        int_ext=sc.int_ext if sc else None,
        time_of_day=sc.time_of_day if sc else None,
        pages_eighths=sc.pages_eighths if sc else None,
        pages_display=sc.pages_display if sc else None,
        estimated_shoot_minutes=sc.estimated_shoot_minutes if sc else None,
        banner_label=strip.banner_label or "",
        cast_ids=cast_ids,
        has_stunts=has_stunts,
        has_vfx=has_vfx
    )

@logistics_router.post("/strips/schedule-scene", response=StripboardItemDetailOut)
def schedule_scene_strip(request, payload: StripScheduleSceneIn):
    target_day = get_object_or_404(ShootDay, id=payload.shoot_day_id)
    scene = get_object_or_404(Scene, id=payload.scene_id)

    strip = StripboardItem.objects.create(
        shoot_day=target_day,
        scene=scene,
        item_type='SCENE',
        order_index=payload.order_index or '9999'
    )
    char_map = _get_project_char_map(target_day.unit.project)
    cast_ids = _get_scene_cast_ids(scene, char_map)
    has_stunts, has_vfx = _scene_flags(scene)

    return StripboardItemDetailOut(
        id=strip.id,
        shoot_day_id=target_day.id,
        order_index=strip.order_index,
        item_type=strip.item_type,
        scene_id=scene.id,
        scene_number=scene.scene_number,
        set_name=scene.set_name,
        int_ext=scene.int_ext,
        time_of_day=scene.time_of_day,
        pages_eighths=scene.pages_eighths,
        pages_display=scene.pages_display,
        estimated_shoot_minutes=scene.estimated_shoot_minutes,
        banner_label="",
        cast_ids=cast_ids,
        has_stunts=has_stunts,
        has_vfx=has_vfx
    )

@logistics_router.post("/strips/banner", response=StripboardItemDetailOut)
def add_banner_strip(request, payload: StripBannerIn):
    target_day = get_object_or_404(ShootDay, id=payload.shoot_day_id)
    strip = StripboardItem.objects.create(
        shoot_day=target_day,
        item_type='BANNER',
        banner_label=payload.banner_label,
        order_index=payload.order_index or '9999'
    )
    return StripboardItemDetailOut(
        id=strip.id,
        shoot_day_id=target_day.id,
        order_index=strip.order_index,
        item_type=strip.item_type,
        scene_id=None,
        scene_number=None,
        set_name=None,
        int_ext=None,
        time_of_day=None,
        pages_eighths=None,
        pages_display=None,
        estimated_shoot_minutes=None,
        banner_label=strip.banner_label,
        cast_ids=[],
        has_stunts=False,
        has_vfx=False
    )

@logistics_router.delete("/strips/{strip_id}")
def delete_strip(request, strip_id: uuid.UUID):
    strip = get_object_or_404(StripboardItem, id=strip_id)
    strip.delete()
    return {"success": True}

# --- DAY-OUT-OF-DAYS (DooD) ENGINE ---

@logistics_router.get("/projects/{project_id}/dood", response=DoodMatrixOut)
def get_project_dood_matrix(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    char_map = _get_project_char_map(project)

    # Scheduled ShootDays ordered chronologically
    shoot_days = list(
        ShootDay.objects.filter(unit__project=project).prefetch_related(
            'stripboard_items__scene__breakdown_items__costume__character'
        ).order_by('calendar_date', 'day_number')
    )

    characters = list(Character.objects.filter(project=project).order_by('cast_id_number'))

    # Pre-calculate which character cast IDs are working on each shoot day
    day_cast_presence = {} # day_idx -> set of cast_id_numbers
    for idx, sday in enumerate(shoot_days):
        cast_present = set()
        for it in sday.stripboard_items.all():
            if it.scene:
                cids = _get_scene_cast_ids(it.scene, char_map)
                cast_present.update(cids)
        day_cast_presence[idx] = cast_present

    # Build character matrix
    dood_characters = []
    day_working_summary = {str(sday.id): 0 for sday in shoot_days}

    for char in characters:
        work_day_indices = []
        for idx in range(len(shoot_days)):
            if char.cast_id_number in day_cast_presence.get(idx, set()):
                work_day_indices.append(idx)

        daily_status = {}
        total_work_days = 0
        total_hold_days = 0

        if not work_day_indices:
            for sday in shoot_days:
                daily_status[str(sday.id)] = ""
        elif len(work_day_indices) == 1:
            first_idx = work_day_indices[0]
            for idx, sday in enumerate(shoot_days):
                if idx == first_idx:
                    daily_status[str(sday.id)] = "SWF"
                    total_work_days += 1
                    day_working_summary[str(sday.id)] += 1
                else:
                    daily_status[str(sday.id)] = ""
        else:
            first_idx = work_day_indices[0]
            last_idx = work_day_indices[-1]

            for idx, sday in enumerate(shoot_days):
                if idx < first_idx or idx > last_idx:
                    daily_status[str(sday.id)] = ""
                elif idx == first_idx:
                    daily_status[str(sday.id)] = "SW"
                    total_work_days += 1
                    day_working_summary[str(sday.id)] += 1
                elif idx == last_idx:
                    daily_status[str(sday.id)] = "WF"
                    total_work_days += 1
                    day_working_summary[str(sday.id)] += 1
                elif idx in work_day_indices:
                    daily_status[str(sday.id)] = "W"
                    total_work_days += 1
                    day_working_summary[str(sday.id)] += 1
                else:
                    daily_status[str(sday.id)] = "H"
                    total_hold_days += 1

        total_span = total_work_days + total_hold_days
        idle_ratio = round(total_hold_days / total_span, 2) if total_span > 0 else 0.0

        dood_characters.append(
            DoodCharacter(
                id=char.id,
                cast_id_number=char.cast_id_number,
                name=char.name,
                actor_name=char.actor_name,
                daily_status=daily_status,
                total_work_days=total_work_days,
                total_hold_days=total_hold_days,
                idle_ratio=idle_ratio
            )
        )

    dood_shoot_days = [
        DoodShootDay(
            id=sday.id,
            day_number=sday.day_number,
            calendar_date=str(sday.calendar_date),
            total_working_actors=day_working_summary.get(str(sday.id), 0)
        )
        for sday in shoot_days
    ]

    return DoodMatrixOut(
        project_id=project.id,
        shoot_days=dood_shoot_days,
        characters=dood_characters,
        total_cast_count=len(characters),
        daily_working_summary=day_working_summary
    )

@logistics_router.get("/projects/{project_id}/stripboard", response=List[ShootDayOut])
def get_project_stripboard(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    days = ShootDay.objects.filter(unit__project=project).prefetch_related(
        'stripboard_items__scene'
    ).order_by('day_number')

    days_out = []
    for day in days:
        items_out = []
        for it in day.stripboard_items.order_by('order_index'):
            sc = it.scene
            items_out.append(
                StripboardItemOut(
                    id=it.id,
                    shoot_day_id=day.id,
                    order_index=it.order_index,
                    item_type=it.item_type,
                    scene_id=sc.id if sc else None,
                    scene_number=sc.scene_number if sc else None,
                    set_name=sc.set_name if sc else None,
                    int_ext=sc.int_ext if sc else None,
                    time_of_day=sc.time_of_day if sc else None,
                    pages_display=sc.pages_display if sc else None,
                    banner_label=it.banner_label
                )
            )
        days_out.append(
            ShootDayOut(
                id=day.id,
                day_number=day.day_number,
                calendar_date=str(day.calendar_date),
                general_crew_call=str(day.general_crew_call) if day.general_crew_call else None,
                shooting_call=str(day.shooting_call) if day.shooting_call else None,
                hospital_address=day.hospital_address,
                items=items_out
            )
        )
    return days_out

# ---------------------------------------------------------------------------
# DPR ENDPOINTS
# ---------------------------------------------------------------------------

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

@logistics_router.get("/shoot-days/{shoot_day_id}/dpr", response=DPROut)
def get_dpr(request, shoot_day_id: uuid.UUID):
    dpr, _ = DailyProductionReport.objects.get_or_create(shoot_day_id=shoot_day_id)
    return dpr

@logistics_router.post("/shoot-days/{shoot_day_id}/dpr", response=DPROut)
def update_dpr(request, shoot_day_id: uuid.UUID, payload: DPRIn):
    dpr, _ = DailyProductionReport.objects.get_or_create(shoot_day_id=shoot_day_id)
    dpr.actual_first_shot = payload.actual_first_shot
    dpr.actual_wrap = payload.actual_wrap
    dpr.scenes_completed = payload.scenes_completed
    dpr.pages_completed = payload.pages_completed
    dpr.camera_rolls_used = payload.camera_rolls_used
    dpr.sound_rolls_used = payload.sound_rolls_used
    dpr.delay_notes = payload.delay_notes
    dpr.save()
    return dpr

# ---------------------------------------------------------------------------
# CREW ROSTER ENDPOINTS
# ---------------------------------------------------------------------------

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

@logistics_router.get("/projects/{project_id}/crew", response=List[CrewMemberOut])
def list_crew(request, project_id: uuid.UUID):
    return CrewMember.objects.filter(project_id=project_id)

@logistics_router.post("/projects/{project_id}/crew", response=CrewMemberOut)
def create_crew_member(request, project_id: uuid.UUID, payload: CrewMemberIn):
    project = get_object_or_404(Project, id=project_id)
    return CrewMember.objects.create(project=project, **payload.dict())

@logistics_router.patch("/crew/{crew_id}", response=CrewMemberOut)
def update_crew_member(request, crew_id: uuid.UUID, payload: CrewMemberIn):
    crew = get_object_or_404(CrewMember, id=crew_id)
    for attr, value in payload.dict().items():
        setattr(crew, attr, value)
    crew.save()
    return crew

@logistics_router.delete("/crew/{crew_id}")
def delete_crew_member(request, crew_id: uuid.UUID):
    crew = get_object_or_404(CrewMember, id=crew_id)
    crew.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# VFX ROUTER
# ---------------------------------------------------------------------------

vfx_router = Router(tags=["VFX Pipeline"])

class VfxShotOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int
    vendor_name: str

class VfxShotIn(Schema):
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int = 0
    vendor_name: str = ""

class VfxStatusUpdateIn(Schema):
    status: str

@vfx_router.get("/projects/{project_id}/shots", response=List[VfxShotOut])
def list_vfx_shots(request, project_id: uuid.UUID):
    return VfxShot.objects.filter(scene__sequence__act__project_id=project_id)

@vfx_router.post("/projects/{project_id}/shots", response=VfxShotOut)
def create_vfx_shot(request, project_id: uuid.UUID, payload: VfxShotIn):
    scene = get_object_or_404(Scene, id=payload.scene_id, sequence__act__project_id=project_id)
    return VfxShot.objects.create(
        scene=scene,
        vfx_id=payload.vfx_id,
        status=payload.status,
        description=payload.description,
        frame_count=payload.frame_count,
        vendor_name=payload.vendor_name
    )

@vfx_router.patch("/shots/{shot_id}", response=VfxShotOut)
def update_vfx_shot(request, shot_id: uuid.UUID, payload: VfxShotIn):
    shot = get_object_or_404(VfxShot, id=shot_id)
    shot.vfx_id = payload.vfx_id
    shot.status = payload.status
    shot.description = payload.description
    shot.frame_count = payload.frame_count
    shot.vendor_name = payload.vendor_name
    shot.save()
    return shot

@vfx_router.patch("/shots/{shot_id}/status", response=VfxShotOut)
def update_vfx_shot_status(request, shot_id: uuid.UUID, payload: VfxStatusUpdateIn):
    shot = get_object_or_404(VfxShot, id=shot_id)
    shot.status = payload.status
    shot.save()
    return shot

@vfx_router.delete("/shots/{shot_id}")
def delete_vfx_shot(request, shot_id: uuid.UUID):
    shot = get_object_or_404(VfxShot, id=shot_id)
    shot.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# FINANCIALS ROUTER
# ---------------------------------------------------------------------------

ai_router = Router(tags=["Universal AI Agent"])
financials_router = Router(tags=["Budgeting & Financials"])

class BudgetAccountOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    account_number: str
    category: str
    description: str

class BudgetAccountIn(Schema):
    account_number: str
    category: str
    description: str

class LineItemOut(Schema):
    id: uuid.UUID
    account_id: uuid.UUID
    description: str
    amount: float
    currency: str
    is_actual: bool

class LineItemIn(Schema):
    description: str
    amount: float
    currency: str = "USD"
    is_actual: bool = False

@financials_router.get("/projects/{project_id}/budget-summary")
def get_budget_summary(request, project_id: uuid.UUID):
    accounts = BudgetAccount.objects.filter(project_id=project_id).prefetch_related('line_items')
    
    summary = {
        'ATL': {'estimated': 0, 'actual': 0},
        'BTL_PRODUCTION': {'estimated': 0, 'actual': 0},
        'BTL_POST': {'estimated': 0, 'actual': 0},
        'OTHER': {'estimated': 0, 'actual': 0},
        'accounts': []
    }
    
    for account in accounts:
        estimated = sum(item.amount for item in account.line_items.all() if not item.is_actual)
        actual = sum(item.amount for item in account.line_items.all() if item.is_actual)
        
        if account.category in summary:
            summary[account.category]['estimated'] += float(estimated)
            summary[account.category]['actual'] += float(actual)
            
        summary['accounts'].append({
            'id': str(account.id),
            'account_number': account.account_number,
            'category': account.category,
            'description': account.description,
            'estimated': float(estimated),
            'actual': float(actual),
        })
        
    return summary

@financials_router.post("/projects/{project_id}/accounts", response=BudgetAccountOut)
def create_budget_account(request, project_id: uuid.UUID, payload: BudgetAccountIn):
    project = get_object_or_404(Project, id=project_id)
    return BudgetAccount.objects.create(project=project, **payload.dict())

@financials_router.patch("/accounts/{account_id}", response=BudgetAccountOut)
def update_budget_account(request, account_id: uuid.UUID, payload: BudgetAccountIn):
    account = get_object_or_404(BudgetAccount, id=account_id)
    for attr, value in payload.dict().items():
        setattr(account, attr, value)
    account.save()
    return account

@financials_router.delete("/accounts/{account_id}")
def delete_budget_account(request, account_id: uuid.UUID):
    account = get_object_or_404(BudgetAccount, id=account_id)
    account.delete()
    return {"success": True}

@financials_router.get("/accounts/{account_id}/items", response=List[LineItemOut])
def list_line_items(request, account_id: uuid.UUID):
    return LineItem.objects.filter(account_id=account_id)

@financials_router.post("/accounts/{account_id}/items", response=LineItemOut)
def create_line_item(request, account_id: uuid.UUID, payload: LineItemIn):
    account = get_object_or_404(BudgetAccount, id=account_id)
    return LineItem.objects.create(account=account, **payload.dict())

@financials_router.patch("/items/{item_id}", response=LineItemOut)
def update_line_item(request, item_id: uuid.UUID, payload: LineItemIn):
    item = get_object_or_404(LineItem, id=item_id)
    for attr, value in payload.dict().items():
        setattr(item, attr, value)
    item.save()
    return item

@financials_router.delete("/items/{item_id}")
def delete_line_item(request, item_id: uuid.UUID):
    item = get_object_or_404(LineItem, id=item_id)
    item.delete()
    return {"success": True}

class ChatMessageDict(Schema):
    role: str
    content: str
    image_url: Optional[str] = None

class ChatHistoryIn(Schema):
    messages: list[ChatMessageDict]

@ai_router.post("/upload-temp-image")
def upload_temp_image(request, file: UploadedFile = File(...)):
    import os
    from django.conf import settings
    os.makedirs(os.path.join(settings.MEDIA_ROOT, 'temp_ai_uploads'), exist_ok=True)
    file_extension = os.path.splitext(file.name)[1]
    file_name = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.MEDIA_ROOT, 'temp_ai_uploads', file_name)
    with open(file_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    absolute_media_url = request.build_absolute_uri(f"{settings.MEDIA_URL}temp_ai_uploads/{file_name}")
    return {"image_url": absolute_media_url}

@ai_router.post("/projects/{project_id}/chat")
def universal_agent_chat(request, project_id: str, payload: ChatHistoryIn):
    try:
        from apps.core.studio_agent import chat_with_agent
        
        # Look for image_url in the last message
        last_msg = payload.messages[-1]
        if last_msg.image_url:
            last_msg.content += f"\n\nImage URL: {last_msg.image_url}"
            
        response_string = chat_with_agent(payload.messages, project_id)
        return {"reply": response_string}
    except Exception as e:
        raise HttpError(500, str(e))

@ai_router.get("/jobs")
def list_jobs(request):
    jobs = BackgroundJob.objects.all().order_by("-created_at")[:50]
    return {"jobs": [
        {"id": str(j.id), "task_name": j.task_name, "status": j.status, 
         "result": j.result, "error_message": j.error_message, 
         "created_at": j.created_at.isoformat()} for j in jobs
    ]}

@ai_router.get("/projects/{project_id}/pending-breakdown")
def get_pending_breakdown(request, project_id: str):
    data = cache.get(f"pending_breakdown_{project_id}")
    return {"data": data}

class ApproveBreakdownIn(Schema):
    scenes: list[Any]

@ai_router.post("/projects/{project_id}/approve-breakdown")
def approve_breakdown(request, project_id: str, payload: ApproveBreakdownIn):
    try:
        project = Project.objects.get(id=project_id)
        for idx, scene_data in enumerate(payload.scenes):
            heading = scene_data.get('heading', '')
            synopsis = scene_data.get('synopsis', '')
            chars = scene_data.get('characters', [])
            
            int_ext = 'EXT' if 'EXT' in heading.upper() else 'INT'
            time_of_day = 'NIGHT' if 'NIGHT' in heading.upper() else 'DAY'
            set_name = heading.replace('INT.', '').replace('EXT.', '').replace('- NIGHT', '').replace('- DAY', '').strip()
            
            Scene.objects.create(
                scene_number=str(idx+1),
                order_index=str(idx+1),
                int_ext=int_ext,
                set_name=set_name,
                time_of_day=time_of_day,
                pages_eighths=8,
                pages_display="1",
                estimated_shoot_minutes=60,
                synopsis=synopsis
            )
            
            for char_name in chars:
                Character.objects.get_or_create(
                    project=project,
                    name=char_name,
                    defaults={'cast_id_number': 0, 'actor_name': ''}
                )
        
        cache.delete(f"pending_breakdown_{project_id}")
        return {"status": "success"}
    except Exception as e:
        from ninja.errors import HttpError
        raise HttpError(500, str(e))

from botocore.exceptions import ClientError

def ensure_bucket_exists(s3, bucket_name):
    try:
        s3.head_bucket(Bucket=bucket_name)
    except ClientError:
        s3.create_bucket(Bucket=bucket_name)
        public_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                }
            ]
        }
        import json
        s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(public_policy))

@ai_router.get("/assets")
def list_assets(request):
    try:
        s3 = boto3.client('s3', 
            endpoint_url=settings.AWS_S3_ENDPOINT_URL, 
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID, 
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        ensure_bucket_exists(s3, settings.AWS_STORAGE_BUCKET_NAME)
        objects = s3.list_objects_v2(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
        files = []
        if 'Contents' in objects:
            for obj in objects['Contents']:
                files.append({
                    "key": obj['Key'],
                    "size": obj['Size'],
                    "last_modified": obj['LastModified'].isoformat(),
                    "url": f"http://localhost:9000/{settings.AWS_STORAGE_BUCKET_NAME}/{obj['Key']}"
                })
        return {"files": files}
    except Exception as e:
        return {"error": str(e), "files": []}

# Register routers on unified api instance
api.add_router("/studio", studio_router)
api.add_router("/narrative", narrative_router)
api.add_router("/shots", shots_router)
api.add_router("/breakdown", breakdown_router)
api.add_router("/logistics", logistics_router)
api.add_router("/vfx", vfx_router)
api.add_router("/financials", financials_router)
api.add_router("/ai", ai_router)
