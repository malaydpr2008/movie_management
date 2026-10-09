"""
Logistics Infrastructure - Django ORM Repository.
"""
from typing import List, Optional, Any, Dict
import uuid
from django.shortcuts import get_object_or_404

from apps.logistics.models import (
    ProductionUnit,
    ShootDay,
    StripboardItem,
    DailyProductionReport,
    CrewMember,
)
from apps.narrative.models import Project, Scene
from apps.breakdown.models import Character


class DjangoLogisticsRepository:
    def get_project_units(self, project_id: uuid.UUID) -> List[ProductionUnit]:
        return list(ProductionUnit.objects.filter(project_id=project_id))

    def get_project_shoot_days(self, project_id: uuid.UUID) -> List[ShootDay]:
        return list(
            ShootDay.objects.filter(unit__project_id=project_id)
            .select_related("unit")
            .prefetch_related(
                "stripboard_items__scene__breakdown_items__costume__character"
            )
            .order_by("day_number")
        )

    def get_project_scenes(self, project_id: uuid.UUID) -> List[Scene]:
        return list(
            Scene.objects.filter(sequence__act__project_id=project_id)
            .prefetch_related("breakdown_items__costume__character")
            .order_by("order_index")
        )

    def get_project_characters(self, project_id: uuid.UUID) -> List[Character]:
        return list(
            Character.objects.filter(project_id=project_id).order_by("cast_id_number")
        )

    def get_or_create_default_unit(self, project_id: uuid.UUID) -> ProductionUnit:
        project = get_object_or_404(Project, id=project_id)
        unit = ProductionUnit.objects.filter(project=project).first()
        if not unit:
            unit = ProductionUnit.objects.create(project=project, name="Main Unit")
        return unit

    def get_unit_by_id(self, unit_id: uuid.UUID) -> ProductionUnit:
        return get_object_or_404(ProductionUnit, id=unit_id)

    def create_shoot_day(
        self,
        unit: ProductionUnit,
        day_number: int,
        calendar_date: str,
        general_crew_call: Optional[str],
        shooting_call: Optional[str],
        hospital_address: str,
    ) -> ShootDay:
        return ShootDay.objects.create(
            unit=unit,
            day_number=day_number,
            calendar_date=calendar_date,
            general_crew_call=general_crew_call,
            shooting_call=shooting_call,
            hospital_address=hospital_address or "",
        )

    def get_strip_by_id(self, strip_id: uuid.UUID) -> StripboardItem:
        return get_object_or_404(
            StripboardItem.objects.select_related("shoot_day__unit__project", "scene"),
            id=strip_id,
        )

    def get_shoot_day_by_id(self, shoot_day_id: uuid.UUID) -> ShootDay:
        return get_object_or_404(ShootDay.objects.select_related("unit__project"), id=shoot_day_id)

    def get_scene_by_id(self, scene_id: uuid.UUID) -> Scene:
        return get_object_or_404(Scene, id=scene_id)

    def create_scene_strip(
        self,
        shoot_day: ShootDay,
        scene: Scene,
        order_index: str,
    ) -> StripboardItem:
        return StripboardItem.objects.create(
            shoot_day=shoot_day,
            scene=scene,
            item_type="SCENE",
            order_index=order_index or "9999",
        )

    def create_banner_strip(
        self,
        shoot_day: ShootDay,
        banner_label: str,
        order_index: str,
    ) -> StripboardItem:
        return StripboardItem.objects.create(
            shoot_day=shoot_day,
            item_type="BANNER",
            banner_label=banner_label,
            order_index=order_index or "9999",
        )

    def delete_strip(self, strip_id: uuid.UUID) -> None:
        strip = get_object_or_404(StripboardItem, id=strip_id)
        strip.delete()

    def get_or_create_dpr(self, shoot_day_id: uuid.UUID) -> DailyProductionReport:
        dpr, _ = DailyProductionReport.objects.get_or_create(shoot_day_id=shoot_day_id)
        return dpr

    def update_dpr(
        self,
        shoot_day_id: uuid.UUID,
        actual_first_shot: Optional[str],
        actual_wrap: Optional[str],
        scenes_completed: int,
        pages_completed: float,
        camera_rolls_used: int,
        sound_rolls_used: int,
        delay_notes: str,
    ) -> DailyProductionReport:
        dpr, _ = DailyProductionReport.objects.get_or_create(shoot_day_id=shoot_day_id)
        dpr.actual_first_shot = actual_first_shot
        dpr.actual_wrap = actual_wrap
        dpr.scenes_completed = scenes_completed
        dpr.pages_completed = pages_completed
        dpr.camera_rolls_used = camera_rolls_used
        dpr.sound_rolls_used = sound_rolls_used
        dpr.delay_notes = delay_notes
        dpr.save()
        return dpr

    def list_crew(self, project_id: uuid.UUID) -> List[CrewMember]:
        return list(CrewMember.objects.filter(project_id=project_id))

    def create_crew_member(self, project_id: uuid.UUID, data: Dict[str, Any]) -> CrewMember:
        project = get_object_or_404(Project, id=project_id)
        return CrewMember.objects.create(project=project, **data)

    def update_crew_member(self, crew_id: uuid.UUID, data: Dict[str, Any]) -> CrewMember:
        crew = get_object_or_404(CrewMember, id=crew_id)
        for attr, value in data.items():
            setattr(crew, attr, value)
        crew.save()
        return crew

    def delete_crew_member(self, crew_id: uuid.UUID) -> None:
        crew = get_object_or_404(CrewMember, id=crew_id)
        crew.delete()
