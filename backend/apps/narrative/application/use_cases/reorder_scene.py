from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.dtos import ReorderSceneCommand, SceneTreeNodeDTO
from apps.narrative.domain.exceptions import InvalidSceneDataError

class ReorderSceneUseCase:
    """
    Application use case for changing a scene's order index and optionally moving
    it to another sequence.
    """

    def __init__(self, repository: ISceneRepository):
        self.repository = repository

    def execute(self, command: ReorderSceneCommand) -> SceneTreeNodeDTO:
        if not command.new_order_index or not command.new_order_index.strip():
            raise InvalidSceneDataError("New order index cannot be empty.")

        return self.repository.reorder(command)
