"""
Breakdown Infrastructure - Django ORM Repository.
"""
from typing import List, Optional, Any, Dict
import uuid
from django.shortcuts import get_object_or_404

from apps.breakdown.models import (
    MasterLocation,
    Character,
    CostumeLook,
    Prop,
    SceneBreakdownItem,
)
from apps.narrative.models import Project, Scene


class DjangoBreakdownRepository:
    def get_scene(self, scene_id: uuid.UUID, project_id: Optional[uuid.UUID] = None) -> Scene:
        if project_id:
            return get_object_or_404(Scene, id=scene_id, sequence__act__project_id=project_id)
        return get_object_or_404(Scene, id=scene_id)

    def get_scene_breakdown_items(self, scene_id: uuid.UUID) -> List[SceneBreakdownItem]:
        scene = self.get_scene(scene_id)
        return list(scene.breakdown_items.select_related("prop", "costume__character").all())

    def create_breakdown_item(
        self,
        scene: Scene,
        element_type: str,
        prop: Optional[Prop],
        costume: Optional[CostumeLook],
        custom_notes: str,
        is_continuity_critical: bool,
    ) -> SceneBreakdownItem:
        return SceneBreakdownItem.objects.create(
            scene=scene,
            element_type=element_type,
            prop=prop,
            costume=costume,
            custom_notes=custom_notes,
            is_continuity_critical=is_continuity_critical,
        )

    def delete_breakdown_item(self, item_id: uuid.UUID) -> None:
        item = get_object_or_404(SceneBreakdownItem, id=item_id)
        item.delete()

    def get_or_create_prop(self, project_id: uuid.UUID, name: str) -> Prop:
        prop, _ = Prop.objects.get_or_create(
            project_id=project_id,
            name=name,
            defaults={"is_hero_prop": False, "quantity": 1},
        )
        return prop

    def list_locations(self, project_id: uuid.UUID) -> List[MasterLocation]:
        project = get_object_or_404(Project, id=project_id)
        return list(MasterLocation.objects.filter(project=project).prefetch_related("scenes"))

    def create_location(self, project_id: uuid.UUID, data: Dict[str, Any]) -> MasterLocation:
        project = get_object_or_404(Project, id=project_id)
        return MasterLocation.objects.create(project=project, **data)

    def get_location(self, location_id: uuid.UUID) -> MasterLocation:
        return get_object_or_404(MasterLocation, id=location_id)

    def update_location(self, location_id: uuid.UUID, data: Dict[str, Any]) -> MasterLocation:
        loc = self.get_location(location_id)
        for field, val in data.items():
            if val is not None:
                setattr(loc, field, val)
        loc.save()
        return loc

    def delete_location(self, location_id: uuid.UUID) -> None:
        loc = self.get_location(location_id)
        loc.delete()

    def list_characters(self, project_id: uuid.UUID) -> List[Character]:
        project = get_object_or_404(Project, id=project_id)
        return list(
            Character.objects.filter(project=project)
            .prefetch_related("costume_looks")
            .order_by("cast_id_number")
        )

    def create_character(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Character:
        project = get_object_or_404(Project, id=project_id)
        return Character.objects.create(project=project, **data)

    def get_character(self, character_id: uuid.UUID) -> Character:
        return get_object_or_404(Character.objects.select_related("project"), id=character_id)

    def update_character(self, character_id: uuid.UUID, data: Dict[str, Any]) -> Character:
        c = self.get_character(character_id)
        for field, val in data.items():
            if val is not None:
                setattr(c, field, val)
        c.save()
        return c

    def delete_character(self, character_id: uuid.UUID) -> None:
        c = get_object_or_404(Character, id=character_id)
        c.delete()

    def create_costume_look(self, character: Character, data: Dict[str, Any]) -> CostumeLook:
        return CostumeLook.objects.create(character=character, **data)

    def get_costume_look(self, look_id: uuid.UUID) -> CostumeLook:
        return get_object_or_404(CostumeLook.objects.select_related("character"), id=look_id)

    def update_costume_look(self, look_id: uuid.UUID, data: Dict[str, Any]) -> CostumeLook:
        look = self.get_costume_look(look_id)
        for field, val in data.items():
            if val is not None:
                setattr(look, field, val)
        look.save()
        return look

    def delete_costume_look(self, look_id: uuid.UUID) -> None:
        look = get_object_or_404(CostumeLook, id=look_id)
        look.delete()

    def list_props(self, project_id: uuid.UUID) -> List[Prop]:
        project = get_object_or_404(Project, id=project_id)
        return list(Prop.objects.filter(project=project))

    def create_prop(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Prop:
        project = get_object_or_404(Project, id=project_id)
        return Prop.objects.create(project=project, **data)

    def get_prop(self, prop_id: uuid.UUID) -> Prop:
        return get_object_or_404(Prop.objects.select_related("project"), id=prop_id)

    def update_prop(self, prop_id: uuid.UUID, data: Dict[str, Any]) -> Prop:
        p = self.get_prop(prop_id)
        for field, val in data.items():
            if val is not None:
                setattr(p, field, val)
        p.save()
        return p

    def delete_prop(self, prop_id: uuid.UUID) -> None:
        p = get_object_or_404(Prop, id=prop_id)
        p.delete()

    def get_project_vfx_sfx(self, project_id: uuid.UUID) -> List[SceneBreakdownItem]:
        project = get_object_or_404(Project, id=project_id)
        return list(
            SceneBreakdownItem.objects.filter(
                scene__sequence__act__project=project,
                element_type__in=["VFX", "SFX"],
            ).select_related("scene", "prop", "costume")
        )
