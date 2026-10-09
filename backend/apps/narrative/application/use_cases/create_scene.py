from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.dtos import CreateSceneCommand, SceneTreeNodeDTO
from apps.narrative.domain.exceptions import InvalidSceneDataError

class CreateSceneUseCase:
    """
    Application use case for creating a new narrative scene.
    Coordinates domain invariants and persistence through the repository port.
    """

    def __init__(self, repository: ISceneRepository):
        self.repository = repository

    def execute(self, command: CreateSceneCommand) -> SceneTreeNodeDTO:
        if not command.scene_number or not command.scene_number.strip():
            raise InvalidSceneDataError("Scene number cannot be empty.")

        if command.pages_eighths < 0:
            raise InvalidSceneDataError("Pages eighths cannot be negative.")

        if command.estimated_shoot_minutes < 0:
            raise InvalidSceneDataError("Estimated shoot minutes cannot be negative.")

        return self.repository.create(command)
