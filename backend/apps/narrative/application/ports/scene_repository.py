from typing import Protocol
import uuid
from apps.narrative.application.dtos import (
    CreateSceneCommand,
    UpdateSceneCommand,
    ReorderSceneCommand,
    SceneDetailDTO,
    SceneTreeNodeDTO,
)

class ISceneRepository(Protocol):
    """
    Port protocol defining narrative scene persistence operations.
    Enforces a clean boundary between application use cases and database adapters.
    """

    def create(self, command: CreateSceneCommand) -> SceneTreeNodeDTO:
        """Persists a new scene and returns its tree representation."""
        ...

    def get_detail(self, scene_id: uuid.UUID) -> SceneDetailDTO:
        """Retrieves complete scene detail with parent hierarchy and coverage counts."""
        ...

    def update(self, command: UpdateSceneCommand) -> SceneDetailDTO:
        """Applies partial updates to a scene and returns its refreshed detail."""
        ...

    def reorder(self, command: ReorderSceneCommand) -> SceneTreeNodeDTO:
        """Reorders a scene and optionally moves it to a target sequence."""
        ...
