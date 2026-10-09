import uuid
from typing import List
from django.shortcuts import get_object_or_404

from apps.shots.models import CameraSetup, Shot, Take, VfxShot
from apps.narrative.models import Scene
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

class DjangoShotsRepository(IShotsRepository):
    """Django ORM implementation for CameraSetup, Shot, and Take persistence."""

    def get_scene_coverage(self, scene_id: uuid.UUID) -> SceneCoverageDTO:
        scene = get_object_or_404(Scene, id=scene_id)
        setups = CameraSetup.objects.filter(scene=scene).prefetch_related('shots__takes').order_by('setup_code')

        setups_out = []
        for setup in setups:
            shots_out = []
            for shot in setup.shots.order_by('shot_code'):
                takes_out = [
                    TakeDTO(
                        id=t.id,
                        shot_id=shot.id,
                        take_number=t.take_number,
                        is_circle_take=t.is_circle_take,
                        duration_seconds=t.duration_seconds,
                        director_notes=t.director_notes,
                        created_at=t.created_at,
                    )
                    for t in shot.takes.all()
                ]
                shots_out.append(
                    ShotDTO(
                        id=shot.id,
                        setup_id=setup.id,
                        shot_code=shot.shot_code,
                        shot_size=shot.shot_size,
                        lens=shot.lens,
                        description=shot.description,
                        vfx_required=shot.vfx_required,
                        created_at=shot.created_at,
                        takes=takes_out,
                    )
                )
            setups_out.append(
                CameraSetupDTO(
                    id=setup.id,
                    scene_id=scene.id,
                    setup_code=setup.setup_code,
                    camera_movement=setup.camera_movement,
                    equipment_notes=setup.equipment_notes,
                    created_at=setup.created_at,
                    shots=shots_out,
                )
            )
        return SceneCoverageDTO(scene_id=scene.id, setups=setups_out)

    def create_setup(self, command: CreateSetupCommand) -> CameraSetupDTO:
        scene = get_object_or_404(Scene, id=command.scene_id)
        setup = CameraSetup.objects.create(
            scene=scene,
            setup_code=command.setup_code,
            camera_movement=command.camera_movement,
            equipment_notes=command.equipment_notes,
        )
        return CameraSetupDTO(
            id=setup.id,
            scene_id=scene.id,
            setup_code=setup.setup_code,
            camera_movement=setup.camera_movement,
            equipment_notes=setup.equipment_notes,
            created_at=setup.created_at,
            shots=[],
        )

    def create_shot(self, command: CreateShotCommand) -> ShotDTO:
        setup = get_object_or_404(CameraSetup, id=command.setup_id)
        shot = Shot.objects.create(
            setup=setup,
            shot_code=command.shot_code,
            shot_size=command.shot_size,
            lens=command.lens,
            description=command.description,
            vfx_required=command.vfx_required,
        )
        return ShotDTO(
            id=shot.id,
            setup_id=setup.id,
            shot_code=shot.shot_code,
            shot_size=shot.shot_size,
            lens=shot.lens,
            description=shot.description,
            vfx_required=shot.vfx_required,
            created_at=shot.created_at,
            takes=[],
        )

    def create_take(self, command: CreateTakeCommand) -> TakeDTO:
        shot = get_object_or_404(Shot, id=command.shot_id)
        take = Take.objects.create(
            shot=shot,
            take_number=command.take_number,
            is_circle_take=command.is_circle_take,
            duration_seconds=command.duration_seconds,
            director_notes=command.director_notes,
        )
        return TakeDTO(
            id=take.id,
            shot_id=shot.id,
            take_number=take.take_number,
            is_circle_take=take.is_circle_take,
            duration_seconds=take.duration_seconds,
            director_notes=take.director_notes,
            created_at=take.created_at,
        )


class DjangoVfxRepository(IVfxRepository):
    """Django ORM implementation for VfxShot persistence."""

    def list_by_project(self, project_id: uuid.UUID) -> List[VfxShotDTO]:
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

    def create_shot(self, project_id: uuid.UUID, command: CreateVfxShotCommand) -> VfxShotDTO:
        scene = get_object_or_404(Scene, id=command.scene_id, sequence__act__project_id=project_id)
        s = VfxShot.objects.create(
            scene=scene,
            vfx_id=command.vfx_id,
            status=command.status,
            description=command.description,
            frame_count=command.frame_count,
            vendor_name=command.vendor_name,
        )
        return VfxShotDTO(
            id=s.id,
            scene_id=s.scene_id,
            vfx_id=s.vfx_id,
            status=s.status,
            description=s.description,
            frame_count=s.frame_count,
            vendor_name=s.vendor_name,
        )

    def update_shot(self, shot_id: uuid.UUID, command: UpdateVfxShotCommand) -> VfxShotDTO:
        s = get_object_or_404(VfxShot, id=shot_id)
        if command.vfx_id is not None:
            s.vfx_id = command.vfx_id
        if command.status is not None:
            s.status = command.status
        if command.description is not None:
            s.description = command.description
        if command.frame_count is not None:
            s.frame_count = command.frame_count
        if command.vendor_name is not None:
            s.vendor_name = command.vendor_name
        s.save()
        return VfxShotDTO(
            id=s.id,
            scene_id=s.scene_id,
            vfx_id=s.vfx_id,
            status=s.status,
            description=s.description,
            frame_count=s.frame_count,
            vendor_name=s.vendor_name,
        )

    def update_status(self, shot_id: uuid.UUID, status: str) -> VfxShotDTO:
        s = get_object_or_404(VfxShot, id=shot_id)
        s.status = status
        s.save()
        return VfxShotDTO(
            id=s.id,
            scene_id=s.scene_id,
            vfx_id=s.vfx_id,
            status=s.status,
            description=s.description,
            frame_count=s.frame_count,
            vendor_name=s.vendor_name,
        )

    def delete_shot(self, shot_id: uuid.UUID) -> None:
        s = get_object_or_404(VfxShot, id=shot_id)
        s.delete()
