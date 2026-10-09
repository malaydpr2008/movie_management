import uuid
from typing import List
from apps.shots.application.ports import IShotsRepository, IVfxRepository
from apps.shots.application.dtos import (
    CameraSetupDTO,
    ShotDTO,
    TakeDTO,
    SceneCoverageDTO,
    CreateSetupCommand,
    CreateShotCommand,
    CreateTakeCommand,
    VfxShotDTO,
    CreateVfxShotCommand,
    UpdateVfxShotCommand,
)

class GetSceneCoverageQuery:
    def __init__(self, repo: IShotsRepository):
        self.repo = repo

    def execute(self, scene_id: uuid.UUID) -> SceneCoverageDTO:
        return self.repo.get_scene_coverage(scene_id)

class CreateSetupUseCase:
    def __init__(self, repo: IShotsRepository):
        self.repo = repo

    def execute(self, command: CreateSetupCommand) -> CameraSetupDTO:
        return self.repo.create_setup(command)

class CreateShotUseCase:
    def __init__(self, repo: IShotsRepository):
        self.repo = repo

    def execute(self, command: CreateShotCommand) -> ShotDTO:
        return self.repo.create_shot(command)

class CreateTakeUseCase:
    def __init__(self, repo: IShotsRepository):
        self.repo = repo

    def execute(self, command: CreateTakeCommand) -> TakeDTO:
        return self.repo.create_take(command)

class ListVfxShotsQuery:
    def __init__(self, repo: IVfxRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID) -> List[VfxShotDTO]:
        return self.repo.list_by_project(project_id)

class CreateVfxShotUseCase:
    def __init__(self, repo: IVfxRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID, command: CreateVfxShotCommand) -> VfxShotDTO:
        return self.repo.create_shot(project_id, command)

class UpdateVfxShotUseCase:
    def __init__(self, repo: IVfxRepository):
        self.repo = repo

    def execute(self, shot_id: uuid.UUID, command: UpdateVfxShotCommand) -> VfxShotDTO:
        return self.repo.update_shot(shot_id, command)

class UpdateVfxStatusUseCase:
    def __init__(self, repo: IVfxRepository):
        self.repo = repo

    def execute(self, shot_id: uuid.UUID, status: str) -> VfxShotDTO:
        return self.repo.update_status(shot_id, status)

class DeleteVfxShotUseCase:
    def __init__(self, repo: IVfxRepository):
        self.repo = repo

    def execute(self, shot_id: uuid.UUID) -> None:
        self.repo.delete_shot(shot_id)
