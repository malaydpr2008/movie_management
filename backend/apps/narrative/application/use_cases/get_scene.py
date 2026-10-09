import uuid
from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.dtos import SceneDetailDTO

class GetSceneDetailUseCase:
    """
    Application use case for retrieving complete scene details including parent hierarchy
    and camera coverage rollups.
    """

    def __init__(self, repository: ISceneRepository):
        self.repository = repository

    def execute(self, scene_id: uuid.UUID) -> SceneDetailDTO:
        return self.repository.get_detail(scene_id)
