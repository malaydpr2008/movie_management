from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.dtos import UpdateSceneCommand, SceneDetailDTO
from apps.narrative.domain.exceptions import InvalidSceneDataError

class UpdateSceneUseCase:
    """
    Application use case for partially updating an existing scene's properties
    or reassigning it to another sequence.
    """

    def __init__(self, repository: ISceneRepository):
        self.repository = repository

    def execute(self, command: UpdateSceneCommand) -> SceneDetailDTO:
        if "pages_eighths" in command.updated_fields and command.pages_eighths is not None:
            if command.pages_eighths < 0:
                raise InvalidSceneDataError("Pages eighths cannot be negative.")

        if "estimated_shoot_minutes" in command.updated_fields and command.estimated_shoot_minutes is not None:
            if command.estimated_shoot_minutes < 0:
                raise InvalidSceneDataError("Estimated shoot minutes cannot be negative.")

        if "scene_number" in command.updated_fields and command.scene_number is not None:
            if not command.scene_number.strip():
                raise InvalidSceneDataError("Scene number cannot be empty.")

        return self.repository.update(command)
