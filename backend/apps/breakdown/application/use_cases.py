"""
Breakdown Application Use Cases.
"""
from typing import List, Dict, Any, Optional
import uuid
from django.db.models import Q

from apps.breakdown.models import (
    MasterLocation,
    Character,
    CostumeLook,
    Prop,
    SceneBreakdownItem,
)
from apps.narrative.models import Project, Scene
from apps.logistics.models import ShootDay
from apps.breakdown.application.ports import IBreakdownRepository
from apps.breakdown.infrastructure.django_breakdown_repository import DjangoBreakdownRepository
from apps.breakdown.api.schemas import (
    ElementIn,
    SceneBreakdownItemOut,
    SceneBreakdownItemIn,
    MasterLocationOut,
    MasterLocationDetailOut,
    MasterLocationIn,
    MasterLocationUpdateIn,
    LinkedSceneSummary,
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
    VFXSFXItemOut,
    VFXSfxItemOut,
    BreakdownSummaryOut,
    CatalogsOut,
)


def build_location_detail(loc: MasterLocation) -> MasterLocationDetailOut:
    scenes = list(loc.scenes.all().order_by("order_index"))
    if not scenes:
        keywords = [w for w in loc.name.split() if len(w) > 4]
        if keywords:
            q_obj = Q()
            for kw in keywords:
                q_obj |= Q(set_name__icontains=kw)
            scenes = list(
                Scene.objects.filter(sequence__act__project=loc.project)
                .filter(q_obj)
                .order_by("order_index")
            )

    linked_summaries = [
        LinkedSceneSummary(
            id=sc.id,
            scene_number=sc.scene_number,
            int_ext=sc.int_ext,
            set_name=sc.set_name,
            time_of_day=sc.time_of_day,
            pages_display=sc.pages_display,
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
        linked_scenes=linked_summaries,
    )


def build_character_detail(c: Character, project: Project) -> CharacterDetailOut:
    looks_out = [
        CostumeLookOut(
            id=lk.id,
            character_id=c.id,
            character_name=c.name,
            look_number=lk.look_number,
            description=lk.description,
            continuity_photo_url=lk.continuity_photo_url,
        )
        for lk in c.costume_looks.all()
    ]

    scenes = (
        Scene.objects.filter(sequence__act__project=project)
        .filter(breakdown_items__costume__character=c)
        .distinct()
    )
    linked_scenes_count = scenes.count()
    if linked_scenes_count == 0:
        char_name = c.name.strip().upper()
        all_scenes = Scene.objects.filter(sequence__act__project=project)
        for sc in all_scenes:
            blocks = (sc.script_data or {}).get("blocks", [])
            if any(
                b.get("type") == "character" and char_name in b.get("content", "").upper()
                for b in blocks
            ):
                linked_scenes_count += 1

    dood_days = (
        ShootDay.objects.filter(
            unit__project=project,
            stripboard_items__scene__in=scenes,
        )
        .distinct()
        .count()
    )

    return CharacterDetailOut(
        id=c.id,
        name=c.name,
        cast_id_number=c.cast_id_number,
        actor_name=c.actor_name,
        looks=looks_out,
        linked_scenes_count=linked_scenes_count,
        dood_work_days=dood_days,
    )


def build_prop_detail(p: Prop, project: Project) -> PropDetailOut:
    items = SceneBreakdownItem.objects.filter(prop=p).select_related("scene")
    linked_summaries = [
        LinkedSceneSummary(
            id=it.scene.id,
            scene_number=it.scene.scene_number,
            int_ext=it.scene.int_ext,
            set_name=it.scene.set_name,
            time_of_day=it.scene.time_of_day,
            pages_display=it.scene.pages_display,
        )
        for it in items
    ]
    return PropDetailOut(
        id=p.id,
        name=p.name,
        is_hero_prop=p.is_hero_prop,
        quantity=p.quantity,
        linked_scenes_count=len(linked_summaries),
        linked_scenes=linked_summaries,
    )


def get_scene_elements(
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    repo: IBreakdownRepository = None
) -> Dict[str, Any]:
    if repo is None:
        repo = DjangoBreakdownRepository()

    scene = repo.get_scene(scene_id, project_id=project_id)
    items = scene.breakdown_items.select_related("prop", "costume__character").all()
    results = []
    for item in items:
        name = ""
        if item.prop:
            name = item.prop.name
        elif item.costume:
            name = f"{item.costume.character.name} - {item.costume.look_number}"
        else:
            name = item.custom_notes.split("|")[0].strip() if "|" in item.custom_notes else item.custom_notes

        desc = item.custom_notes.split("|")[1].strip() if "|" in item.custom_notes else ""
        if not desc and item.custom_notes and name != item.custom_notes:
            desc = item.custom_notes

        results.append({
            "id": str(item.id),
            "category": item.element_type,
            "name": name,
            "description": desc,
        })
    return {"elements": results}


def add_scene_element(
    project_id: uuid.UUID,
    scene_id: uuid.UUID,
    payload: ElementIn,
    repo: IBreakdownRepository = None
) -> Dict[str, Any]:
    if repo is None:
        repo = DjangoBreakdownRepository()

    scene = repo.get_scene(scene_id, project_id=project_id)
    prop = None
    custom_notes = payload.description

    if payload.category.upper() in ["PROPS", "PROP"]:
        prop = repo.get_or_create_prop(project_id, payload.name)
    else:
        custom_notes = f"{payload.name} | {payload.description}" if payload.description else payload.name

    item = repo.create_breakdown_item(
        scene=scene,
        element_type=payload.category.upper(),
        prop=prop,
        costume=None,
        custom_notes=custom_notes,
        is_continuity_critical=False,
    )

    return {
        "id": str(item.id),
        "category": item.element_type,
        "name": payload.name,
        "description": payload.description,
    }


def get_scene_breakdown_items(
    scene_id: uuid.UUID,
    repo: IBreakdownRepository = None
) -> List[SceneBreakdownItemOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()

    scene = repo.get_scene(scene_id)
    items = repo.get_scene_breakdown_items(scene_id)
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
                is_continuity_critical=item.is_continuity_critical,
            )
        )
    return results


def add_scene_breakdown_item(
    scene_id: uuid.UUID,
    payload: SceneBreakdownItemIn,
    repo: IBreakdownRepository = None
) -> SceneBreakdownItemOut:
    if repo is None:
        repo = DjangoBreakdownRepository()

    scene = repo.get_scene(scene_id)
    prop = repo.get_prop(payload.prop_id) if payload.prop_id else None
    costume = repo.get_costume_look(payload.costume_id) if payload.costume_id else None

    item = repo.create_breakdown_item(
        scene=scene,
        element_type=payload.element_type,
        prop=prop,
        costume=costume,
        custom_notes=payload.custom_notes,
        is_continuity_critical=payload.is_continuity_critical,
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
        is_continuity_critical=item.is_continuity_critical,
    )


def run_ai_copilot(scene_id: uuid.UUID) -> Dict[str, str]:
    from apps.narrative.tasks import batch_script_breakdown

    scene = get_object_or_404(
        Scene.objects.select_related("sequence__act__project"), id=scene_id
    )
    project_id = (
        str(scene.sequence.act.project.id)
        if scene.sequence and scene.sequence.act
        else None
    )
    if not project_id and hasattr(scene, "project_id"):
        project_id = str(scene.project_id)

    script_text = ""
    if scene.script_data and "blocks" in scene.script_data:
        script_text = "\n".join([b.get("content", "") for b in scene.script_data["blocks"]])
    elif scene.script_data and "text" in scene.script_data:
        script_text = scene.script_data["text"]
    else:
        script_text = f"{scene.int_ext} {scene.set_name} - {scene.time_of_day}\n(No script text available)"

    batch_script_breakdown.delay(project_id, script_text)
    return {"message": "Breakdown dispatched to background workers."}


def delete_breakdown_item(item_id: uuid.UUID, repo: IBreakdownRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    repo.delete_breakdown_item(item_id)
    return {"success": True}


def list_locations(project_id: uuid.UUID, repo: IBreakdownRepository = None) -> List[MasterLocationDetailOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    locs = repo.list_locations(project_id)
    return [build_location_detail(loc) for loc in locs]


def create_location(payload: MasterLocationIn, repo: IBreakdownRepository = None) -> MasterLocationDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    loc = repo.create_location(payload.project_id, payload.dict(exclude={"project_id"}))
    return build_location_detail(loc)


def update_location(
    location_id: uuid.UUID, payload: MasterLocationUpdateIn, repo: IBreakdownRepository = None
) -> MasterLocationDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    loc = repo.update_location(location_id, payload.dict(exclude_unset=True))
    return build_location_detail(loc)


def delete_location(location_id: uuid.UUID, repo: IBreakdownRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    repo.delete_location(location_id)
    return {"success": True}


def list_characters(project_id: uuid.UUID, repo: IBreakdownRepository = None) -> List[CharacterDetailOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    project = get_object_or_404(Project, id=project_id)
    chars = repo.list_characters(project_id)
    return [build_character_detail(c, project) for c in chars]


def create_character(payload: CharacterIn, repo: IBreakdownRepository = None) -> CharacterDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    project = Project.objects.get(id=payload.project_id)
    c = repo.create_character(payload.project_id, payload.dict(exclude={"project_id"}))
    return build_character_detail(c, project)


def update_character(
    character_id: uuid.UUID, payload: CharacterUpdateIn, repo: IBreakdownRepository = None
) -> CharacterDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    c = repo.update_character(character_id, payload.dict(exclude_unset=True))
    return build_character_detail(c, c.project)


def delete_character(character_id: uuid.UUID, repo: IBreakdownRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    repo.delete_character(character_id)
    return {"success": True}


def add_costume_look(
    character_id: uuid.UUID, payload: CostumeLookIn, repo: IBreakdownRepository = None
) -> CostumeLookOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    c = repo.get_character(character_id)
    look = repo.create_costume_look(c, payload.dict())
    return CostumeLookOut(
        id=look.id,
        character_id=c.id,
        character_name=c.name,
        look_number=look.look_number,
        description=look.description,
        continuity_photo_url=look.continuity_photo_url,
    )


def update_costume_look(
    look_id: uuid.UUID, payload: CostumeLookUpdateIn, repo: IBreakdownRepository = None
) -> CostumeLookOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    look = repo.update_costume_look(look_id, payload.dict(exclude_unset=True))
    return CostumeLookOut(
        id=look.id,
        character_id=look.character.id,
        character_name=look.character.name,
        look_number=look.look_number,
        description=look.description,
        continuity_photo_url=look.continuity_photo_url,
    )


def delete_costume_look(look_id: uuid.UUID, repo: IBreakdownRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    repo.delete_costume_look(look_id)
    return {"success": True}


def list_props(project_id: uuid.UUID, repo: IBreakdownRepository = None) -> List[PropDetailOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    project = get_object_or_404(Project, id=project_id)
    props = repo.list_props(project_id)
    return [build_prop_detail(p, project) for p in props]


def create_prop(payload: PropIn, repo: IBreakdownRepository = None) -> PropDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    project = get_object_or_404(Project, id=payload.project_id)
    p = repo.create_prop(payload.project_id, payload.dict(exclude={"project_id"}))
    return build_prop_detail(p, project)


def update_prop(
    prop_id: uuid.UUID, payload: PropUpdateIn, repo: IBreakdownRepository = None
) -> PropDetailOut:
    if repo is None:
        repo = DjangoBreakdownRepository()
    p = repo.update_prop(prop_id, payload.dict(exclude_unset=True))
    return build_prop_detail(p, p.project)


def delete_prop(prop_id: uuid.UUID, repo: IBreakdownRepository = None) -> Dict[str, bool]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    repo.delete_prop(prop_id)
    return {"success": True}


def get_breakdown_summary(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> BreakdownSummaryOut:
    if repo is None:
        repo = DjangoBreakdownRepository()

    project = Project.objects.get(id=project_id)
    locs = repo.list_locations(project_id)
    locations_out = [build_location_detail(loc) for loc in locs]

    chars = repo.list_characters(project_id)
    characters_out = [build_character_detail(c, project) for c in chars]

    props = repo.list_props(project_id)
    props_out = [build_prop_detail(p, project) for p in props]

    vfx_sfx = repo.get_project_vfx_sfx(project_id)
    vfx_sfx_out = [
        VFXSFXItemOut(
            id=item.id,
            scene_id=item.scene.id,
            scene_number=item.scene.scene_number,
            element_type=item.element_type,
            custom_notes=item.custom_notes,
            is_continuity_critical=item.is_continuity_critical,
        )
        for item in vfx_sfx
    ]

    total_vfx = sum(1 for item in vfx_sfx if item.element_type == "VFX")
    total_sfx = sum(1 for item in vfx_sfx if item.element_type == "SFX")

    return BreakdownSummaryOut(
        total_locations=len(locations_out),
        total_characters=len(characters_out),
        total_props=len(props_out),
        total_vfx=total_vfx,
        total_sfx=total_sfx,
        locations=locations_out,
        characters=characters_out,
        props=props_out,
        vfx_sfx_items=vfx_sfx_out,
    )


def get_project_locations(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> List[MasterLocationOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    locs = repo.list_locations(project_id)
    return [
        MasterLocationOut(
            id=loc.id,
            name=loc.name,
            address=loc.address,
            gps_coordinates=loc.gps_coordinates,
            sun_path_notes=loc.sun_path_notes,
        )
        for loc in locs
    ]


def get_project_characters(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> List[CharacterOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    chars = repo.list_characters(project_id)
    characters_out = []
    for c in chars:
        looks_out = [
            CostumeLookOut(
                id=lk.id,
                character_id=c.id,
                character_name=c.name,
                look_number=lk.look_number,
                description=lk.description,
                continuity_photo_url=lk.continuity_photo_url,
            )
            for lk in c.costume_looks.all()
        ]
        characters_out.append(
            CharacterOut(
                id=c.id,
                name=c.name,
                cast_id_number=c.cast_id_number,
                actor_name=c.actor_name,
                looks=looks_out,
            )
        )
    return characters_out


def get_project_props(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> List[PropOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    props = repo.list_props(project_id)
    return [
        PropOut(id=p.id, name=p.name, is_hero_prop=p.is_hero_prop, quantity=p.quantity)
        for p in props
    ]


def get_project_vfx(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> List[VFXSfxItemOut]:
    if repo is None:
        repo = DjangoBreakdownRepository()
    items = repo.get_project_vfx_sfx(project_id)
    return [
        VFXSfxItemOut(
            id=item.id,
            element_type=item.element_type,
            target=item.prop.name if item.prop else (f"{item.costume}" if item.costume else item.custom_notes),
            custom_notes=item.custom_notes,
            is_continuity_critical=item.is_continuity_critical,
            scene_id=item.scene_id,
        )
        for item in items
    ]


def get_project_catalogs(
    project_id: uuid.UUID, repo: IBreakdownRepository = None
) -> CatalogsOut:
    return CatalogsOut(
        characters=get_project_characters(project_id, repo=repo),
        props=get_project_props(project_id, repo=repo),
        locations=get_project_locations(project_id, repo=repo),
    )
