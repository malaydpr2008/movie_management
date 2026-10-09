"""
Logistics Application Use Cases.
"""
from typing import List, Dict, Any, Optional
import uuid
from apps.logistics.tasks import generate_call_sheet_pdf
from apps.logistics.domain import (
    format_pages_eighths,
    build_character_mapping,
    extract_scene_cast_ids,
    extract_scene_flags,
    calculate_dood_matrix,
)
from apps.logistics.application.ports import ILogisticsRepository
from apps.logistics.infrastructure.django_logistics_repository import DjangoLogisticsRepository
from apps.logistics.api.schemas import (
    ScheduleOut,
    ProductionUnitOut,
    ShootDayDetailOut,
    StripboardItemDetailOut,
    UnassignedSceneOut,
    ShootDayCreateIn,
    StripReorderIn,
    StripScheduleSceneIn,
    StripBannerIn,
    DoodMatrixOut,
    DoodShootDay,
    DoodCharacter,
    ShootDayOut,
    StripboardItemOut,
    DPROut,
    DPRIn,
    CrewMemberOut,
    CrewMemberIn,
)


def queue_call_sheet_generation(shoot_day_id: uuid.UUID) -> Dict[str, Any]:
    generate_call_sheet_pdf.delay(str(shoot_day_id))
    return {"message": "Call Sheet generation queued in background."}


def get_project_schedule(
    project_id: uuid.UUID,
    repo: ILogisticsRepository = None
) -> ScheduleOut:
    if repo is None:
        repo = DjangoLogisticsRepository()

    characters = repo.get_project_characters(project_id)
    char_map = build_character_mapping(characters)

    units = repo.get_project_units(project_id)
    units_out = [
        ProductionUnitOut(id=u.id, project_id=project_id, name=u.name)
        for u in units
    ]

    shoot_days = repo.get_project_shoot_days(project_id)
    scheduled_scene_ids = set()
    days_out: List[ShootDayDetailOut] = []

    for day in shoot_days:
        day_items = list(day.stripboard_items.all().order_by("order_index", "created_at"))
        items_out: List[StripboardItemDetailOut] = []
        total_eighths = 0
        total_minutes = 0
        scene_count = 0

        for it in day_items:
            sc = it.scene
            cast_ids: List[int] = []
            has_stunts = False
            has_vfx = False

            if sc:
                scheduled_scene_ids.add(sc.id)
                scene_count += 1
                total_eighths += sc.pages_eighths
                total_minutes += sc.estimated_shoot_minutes
                cast_ids = extract_scene_cast_ids(
                    sc.breakdown_items.all(), sc.script_data, char_map
                )
                has_stunts, has_vfx = extract_scene_flags(sc.breakdown_items.all())

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
                    has_vfx=has_vfx,
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
                total_pages_display=format_pages_eighths(total_eighths),
                total_pages_eighths=total_eighths,
                total_estimated_shoot_minutes=total_minutes,
                scene_count=scene_count,
                items=items_out,
            )
        )

    all_scenes = repo.get_project_scenes(project_id)
    unassigned_scenes_out: List[UnassignedSceneOut] = []

    for sc in all_scenes:
        if sc.id not in scheduled_scene_ids:
            cast_ids = extract_scene_cast_ids(
                sc.breakdown_items.all(), sc.script_data, char_map
            )
            has_stunts, has_vfx = extract_scene_flags(sc.breakdown_items.all())
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
                    has_vfx=has_vfx,
                )
            )

    return ScheduleOut(
        project_id=project_id,
        units=units_out,
        shoot_days=days_out,
        unassigned_scenes=unassigned_scenes_out,
    )


def create_shoot_day(
    payload: ShootDayCreateIn,
    repo: ILogisticsRepository = None
) -> Any:
    if repo is None:
        repo = DjangoLogisticsRepository()

    if payload.unit_id:
        unit = repo.get_unit_by_id(payload.unit_id)
    elif payload.project_id:
        unit = repo.get_or_create_default_unit(payload.project_id)
    else:
        return {"error": "Either unit_id or project_id must be provided"}

    day = repo.create_shoot_day(
        unit=unit,
        day_number=payload.day_number,
        calendar_date=payload.calendar_date,
        general_crew_call=payload.general_crew_call,
        shooting_call=payload.shooting_call,
        hospital_address=payload.hospital_address or "",
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
        items=[],
    )


def reorder_strip(
    payload: StripReorderIn,
    repo: ILogisticsRepository = None
) -> StripboardItemDetailOut:
    if repo is None:
        repo = DjangoLogisticsRepository()

    strip = repo.get_strip_by_id(payload.strip_id)
    target_day = repo.get_shoot_day_by_id(payload.target_shoot_day_id)

    strip.shoot_day = target_day
    strip.order_index = payload.new_order_index
    strip.save()

    sc = strip.scene
    cast_ids: List[int] = []
    has_stunts = False
    has_vfx = False

    if sc:
        characters = repo.get_project_characters(target_day.unit.project_id)
        char_map = build_character_mapping(characters)
        cast_ids = extract_scene_cast_ids(sc.breakdown_items.all(), sc.script_data, char_map)
        has_stunts, has_vfx = extract_scene_flags(sc.breakdown_items.all())

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
        has_vfx=has_vfx,
    )


def schedule_scene_strip(
    payload: StripScheduleSceneIn,
    repo: ILogisticsRepository = None
) -> StripboardItemDetailOut:
    if repo is None:
        repo = DjangoLogisticsRepository()

    target_day = repo.get_shoot_day_by_id(payload.shoot_day_id)
    scene = repo.get_scene_by_id(payload.scene_id)

    strip = repo.create_scene_strip(
        shoot_day=target_day,
        scene=scene,
        order_index=payload.order_index or "9999",
    )

    characters = repo.get_project_characters(target_day.unit.project_id)
    char_map = build_character_mapping(characters)
    cast_ids = extract_scene_cast_ids(scene.breakdown_items.all(), scene.script_data, char_map)
    has_stunts, has_vfx = extract_scene_flags(scene.breakdown_items.all())

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
        has_vfx=has_vfx,
    )


def add_banner_strip(
    payload: StripBannerIn,
    repo: ILogisticsRepository = None
) -> StripboardItemDetailOut:
    if repo is None:
        repo = DjangoLogisticsRepository()

    target_day = repo.get_shoot_day_by_id(payload.shoot_day_id)
    strip = repo.create_banner_strip(
        shoot_day=target_day,
        banner_label=payload.banner_label,
        order_index=payload.order_index or "9999",
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
        has_vfx=False,
    )


def delete_strip(strip_id: uuid.UUID, repo: ILogisticsRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoLogisticsRepository()
    repo.delete_strip(strip_id)
    return {"success": True}


def get_project_dood_matrix(
    project_id: uuid.UUID,
    repo: ILogisticsRepository = None
) -> DoodMatrixOut:
    if repo is None:
        repo = DjangoLogisticsRepository()

    characters = repo.get_project_characters(project_id)
    char_map = build_character_mapping(characters)

    # Chronologically ordered shoot days
    shoot_days = repo.get_project_shoot_days(project_id)
    shoot_days.sort(key=lambda d: (d.calendar_date, d.day_number))

    # Pre-calculate presence
    day_cast_presence: Dict[int, set] = {}
    for idx, sday in enumerate(shoot_days):
        cast_present = set()
        for it in sday.stripboard_items.all():
            if it.scene:
                cids = extract_scene_cast_ids(
                    it.scene.breakdown_items.all(), it.scene.script_data, char_map
                )
                cast_present.update(cids)
        day_cast_presence[idx] = cast_present

    # Domain DOOD calculation
    res = calculate_dood_matrix(shoot_days, characters, day_cast_presence)

    dood_shoot_days = [
        DoodShootDay(
            id=d.id,
            day_number=d.day_number,
            calendar_date=d.calendar_date,
            total_working_actors=d.total_working_actors,
        )
        for d in res.shoot_days
    ]

    dood_characters = [
        DoodCharacter(
            id=c.id,
            cast_id_number=c.cast_id_number,
            name=c.name,
            actor_name=c.actor_name,
            daily_status=c.daily_status,
            total_work_days=c.total_work_days,
            total_hold_days=c.total_hold_days,
            idle_ratio=c.idle_ratio,
        )
        for c in res.characters
    ]

    return DoodMatrixOut(
        project_id=project_id,
        shoot_days=dood_shoot_days,
        characters=dood_characters,
        total_cast_count=res.total_cast_count,
        daily_working_summary=res.daily_working_summary,
    )


def get_project_stripboard(
    project_id: uuid.UUID,
    repo: ILogisticsRepository = None
) -> List[ShootDayOut]:
    if repo is None:
        repo = DjangoLogisticsRepository()

    days = repo.get_project_shoot_days(project_id)
    days_out: List[ShootDayOut] = []

    for day in days:
        items_out: List[StripboardItemOut] = []
        for it in day.stripboard_items.order_by("order_index"):
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
                    banner_label=it.banner_label or "",
                )
            )
        days_out.append(
            ShootDayOut(
                id=day.id,
                day_number=day.day_number,
                calendar_date=str(day.calendar_date),
                general_crew_call=str(day.general_crew_call) if day.general_crew_call else None,
                shooting_call=str(day.shooting_call) if day.shooting_call else None,
                hospital_address=day.hospital_address or "",
                items=items_out,
            )
        )
    return days_out


def get_dpr(shoot_day_id: uuid.UUID, repo: ILogisticsRepository = None) -> DPROut:
    if repo is None:
        repo = DjangoLogisticsRepository()
    dpr = repo.get_or_create_dpr(shoot_day_id)
    return DPROut(
        id=dpr.id,
        shoot_day_id=dpr.shoot_day_id,
        actual_first_shot=dpr.actual_first_shot,
        actual_wrap=dpr.actual_wrap,
        scenes_completed=dpr.scenes_completed,
        pages_completed=float(dpr.pages_completed),
        camera_rolls_used=dpr.camera_rolls_used,
        sound_rolls_used=dpr.sound_rolls_used,
        delay_notes=dpr.delay_notes or "",
    )


def update_dpr(
    shoot_day_id: uuid.UUID,
    payload: DPRIn,
    repo: ILogisticsRepository = None
) -> DPROut:
    if repo is None:
        repo = DjangoLogisticsRepository()
    dpr = repo.update_dpr(
        shoot_day_id=shoot_day_id,
        actual_first_shot=payload.actual_first_shot,
        actual_wrap=payload.actual_wrap,
        scenes_completed=payload.scenes_completed,
        pages_completed=payload.pages_completed,
        camera_rolls_used=payload.camera_rolls_used,
        sound_rolls_used=payload.sound_rolls_used,
        delay_notes=payload.delay_notes,
    )
    return DPROut(
        id=dpr.id,
        shoot_day_id=dpr.shoot_day_id,
        actual_first_shot=dpr.actual_first_shot,
        actual_wrap=dpr.actual_wrap,
        scenes_completed=dpr.scenes_completed,
        pages_completed=float(dpr.pages_completed),
        camera_rolls_used=dpr.camera_rolls_used,
        sound_rolls_used=dpr.sound_rolls_used,
        delay_notes=dpr.delay_notes or "",
    )


def list_crew(project_id: uuid.UUID, repo: ILogisticsRepository = None) -> List[CrewMemberOut]:
    if repo is None:
        repo = DjangoLogisticsRepository()
    members = repo.list_crew(project_id)
    return [
        CrewMemberOut(
            id=m.id,
            project_id=m.project_id,
            name=m.name,
            department=m.department,
            role=m.role,
            email=m.email or "",
            phone=m.phone or "",
        )
        for m in members
    ]


def create_crew_member(
    project_id: uuid.UUID,
    payload: CrewMemberIn,
    repo: ILogisticsRepository = None
) -> CrewMemberOut:
    if repo is None:
        repo = DjangoLogisticsRepository()
    m = repo.create_crew_member(project_id, payload.dict())
    return CrewMemberOut(
        id=m.id,
        project_id=m.project_id,
        name=m.name,
        department=m.department,
        role=m.role,
        email=m.email or "",
        phone=m.phone or "",
    )


def update_crew_member(
    crew_id: uuid.UUID,
    payload: CrewMemberIn,
    repo: ILogisticsRepository = None
) -> CrewMemberOut:
    if repo is None:
        repo = DjangoLogisticsRepository()
    m = repo.update_crew_member(crew_id, payload.dict())
    return CrewMemberOut(
        id=m.id,
        project_id=m.project_id,
        name=m.name,
        department=m.department,
        role=m.role,
        email=m.email or "",
        phone=m.phone or "",
    )


def delete_crew_member(crew_id: uuid.UUID, repo: ILogisticsRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoLogisticsRepository()
    repo.delete_crew_member(crew_id)
    return {"success": True}
