import uuid
from typing import List
from apps.core.studio.application.ports import IStudioRepository
from apps.core.studio.application.dtos import (
    ProjectDTO,
    CreateProjectCommand,
    CrewMemberDTO,
    AddCrewMemberCommand,
)
from apps.shots.application.dtos import VfxShotDTO
from apps.core.studio.domain import slugify_title

class ListProjectsQuery:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self) -> List[ProjectDTO]:
        return self.repo.list_projects()

class CreateProjectUseCase:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self, command: CreateProjectCommand, creator_user=None) -> ProjectDTO:
        base_slug = command.slug or slugify_title(command.title)
        slug = base_slug
        counter = 1
        while self.repo.slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        return self.repo.create_project(command, slug, creator_user)

class GetStudioVfxShotsQuery:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID) -> List[VfxShotDTO]:
        return self.repo.list_vfx_shots(project_id)

class UpdateStudioVfxStatusUseCase:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID, shot_id: uuid.UUID, status: str) -> VfxShotDTO:
        return self.repo.update_vfx_status(project_id, shot_id, status)

class GetCrewRosterQuery:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID) -> List[CrewMemberDTO]:
        return self.repo.list_crew(project_id)

class AddCrewMemberUseCase:
    def __init__(self, repo: IStudioRepository):
        self.repo = repo

    def execute(self, project_id: uuid.UUID, command: AddCrewMemberCommand) -> CrewMemberDTO:
        return self.repo.add_crew(project_id, command)
