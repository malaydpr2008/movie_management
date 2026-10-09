"""
Logistics Application Ports.
"""
from typing import Protocol, List, Optional, Any, Dict
import uuid


class ILogisticsRepository(Protocol):
    def get_project_units(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def get_project_shoot_days(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def get_project_scenes(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def get_project_characters(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def get_or_create_default_unit(self, project_id: uuid.UUID) -> Any:
        ...

    def get_unit_by_id(self, unit_id: uuid.UUID) -> Any:
        ...

    def create_shoot_day(
        self,
        unit: Any,
        day_number: int,
        calendar_date: str,
        general_crew_call: Optional[str],
        shooting_call: Optional[str],
        hospital_address: str,
    ) -> Any:
        ...

    def get_strip_by_id(self, strip_id: uuid.UUID) -> Any:
        ...

    def get_shoot_day_by_id(self, shoot_day_id: uuid.UUID) -> Any:
        ...

    def get_scene_by_id(self, scene_id: uuid.UUID) -> Any:
        ...

    def create_scene_strip(
        self,
        shoot_day: Any,
        scene: Any,
        order_index: str,
    ) -> Any:
        ...

    def create_banner_strip(
        self,
        shoot_day: Any,
        banner_label: str,
        order_index: str,
    ) -> Any:
        ...

    def delete_strip(self, strip_id: uuid.UUID) -> None:
        ...

    def get_or_create_dpr(self, shoot_day_id: uuid.UUID) -> Any:
        ...

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
    ) -> Any:
        ...

    def list_crew(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def create_crew_member(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def update_crew_member(self, crew_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def delete_crew_member(self, crew_id: uuid.UUID) -> None:
        ...


class ICallSheetPdfRenderer(Protocol):
    """
    Port for generating Call Sheet PDFs.
    Allows swapping rendering backends (ReportLab, Weasyprint, HTML-to-PDF) or mocking in tests.
    """

    def render(
        self,
        day_number: int,
        calendar_date: Any,
        general_crew_call: Any,
        hospital_address: str = "",
    ) -> bytes:
        ...

