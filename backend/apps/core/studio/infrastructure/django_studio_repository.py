import uuid
from typing import List
from django.shortcuts import get_object_or_404

from apps.narrative.models import Project
from apps.core.models import ProjectMembership
from apps.shots.models import VfxShot
from apps.logistics.models import CrewMember
from apps.core.studio.application.ports import IStudioRepository
from apps.core.studio.application.dtos import (
    ProjectDTO,
    CreateProjectCommand,
    CrewMemberDTO,
    AddCrewMemberCommand,
)
from apps.shots.application.dtos import VfxShotDTO

class DjangoStudioRepository(IStudioRepository):
    """Django ORM implementation for Studio Hub operations."""

    def list_projects(self) -> List[ProjectDTO]:
        projects = Project.objects.all()
        return [
            ProjectDTO(
                id=p.id,
                title=p.title,
                slug=p.slug,
                aspect_ratio=p.aspect_ratio,
                target_runtime_minutes=p.target_runtime_minutes,
                created_at=p.created_at,
            )
            for p in projects
        ]

    def slug_exists(self, slug: str) -> bool:
        return Project.objects.filter(slug=slug).exists()

    def create_project(self, command: CreateProjectCommand, resolved_slug: str, creator_user=None) -> ProjectDTO:
        project = Project.objects.create(
            title=command.title,
            slug=resolved_slug,
            status=command.status,
            aspect_ratio=command.aspect_ratio,
            target_runtime_minutes=command.target_runtime_minutes,
        )
        if creator_user and hasattr(creator_user, 'is_authenticated') and creator_user.is_authenticated:
            ProjectMembership.objects.create(
                user=creator_user,
                project=project,
                role='OWNER',
            )
        return ProjectDTO(
            id=project.id,
            title=project.title,
            slug=project.slug,
            aspect_ratio=project.aspect_ratio,
            target_runtime_minutes=project.target_runtime_minutes,
            created_at=project.created_at,
        )

    def list_vfx_shots(self, project_id: uuid.UUID) -> List[VfxShotDTO]:
        shots = VfxShot.objects.filter(scene__sequence__act__project_id=project_id)
        return [
            VfxShotDTO(
                id=s.id,
                scene_id=s.scene_id,
                vfx_id=s.vfx_id,
                status=s.status,
                description=s.description,
                frame_count=s.frame_count,
                vendor_name=s.vendor_name,
            )
            for s in shots
        ]

    def update_vfx_status(self, project_id: uuid.UUID, shot_id: uuid.UUID, status: str) -> VfxShotDTO:
        shot = get_object_or_404(VfxShot, id=shot_id, scene__sequence__act__project_id=project_id)
        shot.status = status
        shot.save()
        return VfxShotDTO(
            id=shot.id,
            scene_id=shot.scene_id,
            vfx_id=shot.vfx_id,
            status=shot.status,
            description=shot.description,
            frame_count=shot.frame_count,
            vendor_name=shot.vendor_name,
        )

    def list_crew(self, project_id: uuid.UUID) -> List[CrewMemberDTO]:
        crew = CrewMember.objects.filter(project_id=project_id).order_by('department', 'name')
        return [
            CrewMemberDTO(
                id=c.id,
                project_id=c.project_id,
                name=c.name,
                role=c.role,
                department=c.department,
                union_affiliation=c.union_affiliation,
                day_rate=float(c.day_rate),
                email=c.email,
                phone=c.phone,
                created_at=c.created_at,
            )
            for c in crew
        ]

    def add_crew(self, project_id: uuid.UUID, command: AddCrewMemberCommand) -> CrewMemberDTO:
        project = get_object_or_404(Project, id=project_id)
        crew = CrewMember.objects.create(
            project=project,
            name=command.name,
            role=command.role,
            department=command.department,
            union_affiliation=command.union_affiliation,
            day_rate=command.day_rate,
            email=command.email,
            phone=command.phone,
        )
        return CrewMemberDTO(
            id=crew.id,
            project_id=crew.project_id,
            name=crew.name,
            role=crew.role,
            department=crew.department,
            union_affiliation=crew.union_affiliation,
            day_rate=float(crew.day_rate),
            email=crew.email,
            phone=crew.phone,
            created_at=crew.created_at,
        )
