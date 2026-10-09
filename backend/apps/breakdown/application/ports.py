"""
Breakdown Application Ports.
"""
from typing import Protocol, List, Optional, Any, Dict
import uuid


class IBreakdownRepository(Protocol):
    def get_scene(self, scene_id: uuid.UUID, project_id: Optional[uuid.UUID] = None) -> Any:
        ...

    def get_scene_breakdown_items(self, scene_id: uuid.UUID) -> List[Any]:
        ...

    def create_breakdown_item(
        self,
        scene: Any,
        element_type: str,
        prop: Optional[Any],
        costume: Optional[Any],
        custom_notes: str,
        is_continuity_critical: bool,
    ) -> Any:
        ...

    def delete_breakdown_item(self, item_id: uuid.UUID) -> None:
        ...

    def get_or_create_prop(self, project_id: uuid.UUID, name: str) -> Any:
        ...

    def list_locations(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def create_location(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def get_location(self, location_id: uuid.UUID) -> Any:
        ...

    def update_location(self, location_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def delete_location(self, location_id: uuid.UUID) -> None:
        ...

    def list_characters(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def create_character(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def get_character(self, character_id: uuid.UUID) -> Any:
        ...

    def update_character(self, character_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def delete_character(self, character_id: uuid.UUID) -> None:
        ...

    def create_costume_look(self, character: Any, data: Dict[str, Any]) -> Any:
        ...

    def get_costume_look(self, look_id: uuid.UUID) -> Any:
        ...

    def update_costume_look(self, look_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def delete_costume_look(self, look_id: uuid.UUID) -> None:
        ...

    def list_props(self, project_id: uuid.UUID) -> List[Any]:
        ...

    def create_prop(self, project_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def get_prop(self, prop_id: uuid.UUID) -> Any:
        ...

    def update_prop(self, prop_id: uuid.UUID, data: Dict[str, Any]) -> Any:
        ...

    def delete_prop(self, prop_id: uuid.UUID) -> None:
        ...

    def get_project_vfx_sfx(self, project_id: uuid.UUID) -> List[Any]:
        ...
