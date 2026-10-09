import uuid
from typing import List, Optional, Any
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.core.studio.application.use_cases import (
    ListProjectsQuery,
    CreateProjectUseCase,
    GetStudioVfxShotsQuery,
    UpdateStudioVfxStatusUseCase,
    GetCrewRosterQuery,
    AddCrewMemberUseCase,
)
from apps.core.studio.application.dtos import (
    CreateProjectCommand,
    AddCrewMemberCommand,
)
from apps.core.studio.infrastructure.django_studio_repository import DjangoStudioRepository
from apps.shots.api.router import VfxShotOut, VfxStatusUpdateIn

studio_router = Router(tags=["Studio Hub"])

class ProjectOut(Schema):
    id: uuid.UUID
    title: str
    slug: str
    aspect_ratio: str
    target_runtime_minutes: int
    created_at: Any

class ProjectCreateIn(Schema):
    title: str
    slug: Optional[str] = None
    status: Optional[str] = "PRE_PRODUCTION"
    aspect_ratio: str = "2.39:1"
    target_runtime_minutes: int = 120

    class Config:
        extra = "ignore"

class CrewMemberOut(Schema):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    role: str
    department: str
    union_affiliation: str
    day_rate: float
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Any

class CrewMemberIn(Schema):
    name: str
    role: str
    department: str
    union_affiliation: str = "Non-Union"
    day_rate: float = 0.00
    email: Optional[str] = None
    phone: Optional[str] = None

def _get_repo():
    return DjangoStudioRepository()

@studio_router.get("/projects", response=List[ProjectOut])
def list_projects(request):
    q = ListProjectsQuery(_get_repo())
    dtos = q.execute()
    return [
        ProjectOut(
            id=d.id,
            title=d.title,
            slug=d.slug,
            aspect_ratio=d.aspect_ratio,
            target_runtime_minutes=d.target_runtime_minutes,
            created_at=d.created_at,
        )
        for d in dtos
    ]

@studio_router.post("/projects", response=ProjectOut)
def create_project(request, payload: ProjectCreateIn):
    try:
        uc = CreateProjectUseCase(_get_repo())
        cmd = CreateProjectCommand(
            title=payload.title,
            slug=payload.slug,
            status=payload.status,
            aspect_ratio=payload.aspect_ratio,
            target_runtime_minutes=payload.target_runtime_minutes,
        )
        user = getattr(request, 'user', None)
        dto = uc.execute(cmd, creator_user=user)
        return ProjectOut(
            id=dto.id,
            title=dto.title,
            slug=dto.slug,
            aspect_ratio=dto.aspect_ratio,
            target_runtime_minutes=dto.target_runtime_minutes,
            created_at=dto.created_at,
        )
    except Exception as e:
        raise HttpError(500, f"Failed to create project: {str(e)}")

@studio_router.get("/projects/{project_id}/vfx", response=List[VfxShotOut])
def get_vfx_shots(request, project_id: uuid.UUID):
    q = GetStudioVfxShotsQuery(_get_repo())
    dtos = q.execute(project_id)
    return [
        VfxShotOut(
            id=d.id,
            scene_id=d.scene_id,
            vfx_id=d.vfx_id,
            status=d.status,
            description=d.description,
            frame_count=d.frame_count,
            vendor_name=d.vendor_name,
        )
        for d in dtos
    ]

@studio_router.patch("/projects/{project_id}/vfx/{shot_id}/status", response=VfxShotOut)
def update_vfx_status(request, project_id: uuid.UUID, shot_id: uuid.UUID, payload: VfxStatusUpdateIn):
    uc = UpdateStudioVfxStatusUseCase(_get_repo())
    dto = uc.execute(project_id, shot_id, payload.status)
    return VfxShotOut(
        id=dto.id,
        scene_id=dto.scene_id,
        vfx_id=dto.vfx_id,
        status=dto.status,
        description=dto.description,
        frame_count=dto.frame_count,
        vendor_name=dto.vendor_name,
    )

@studio_router.get("/projects/{project_id}/crew", response=List[CrewMemberOut])
def get_crew_roster(request, project_id: uuid.UUID):
    q = GetCrewRosterQuery(_get_repo())
    dtos = q.execute(project_id)
    return [
        CrewMemberOut(
            id=d.id,
            project_id=d.project_id,
            name=d.name,
            role=d.role,
            department=d.department,
            union_affiliation=d.union_affiliation,
            day_rate=d.day_rate,
            email=d.email,
            phone=d.phone,
            created_at=d.created_at,
        )
        for d in dtos
    ]

@studio_router.post("/projects/{project_id}/crew", response=CrewMemberOut)
def add_crew_member(request, project_id: uuid.UUID, payload: CrewMemberIn):
    uc = AddCrewMemberUseCase(_get_repo())
    cmd = AddCrewMemberCommand(
        name=payload.name,
        role=payload.role,
        department=payload.department,
        union_affiliation=payload.union_affiliation,
        day_rate=payload.day_rate,
        email=payload.email,
        phone=payload.phone,
    )
    dto = uc.execute(project_id, cmd)
    return CrewMemberOut(
        id=dto.id,
        project_id=dto.project_id,
        name=dto.name,
        role=dto.role,
        department=dto.department,
        union_affiliation=dto.union_affiliation,
        day_rate=dto.day_rate,
        email=dto.email,
        phone=dto.phone,
        created_at=dto.created_at,
    )
