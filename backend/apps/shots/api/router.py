import uuid
from typing import List, Optional, Any
from ninja import Router, Schema

from apps.shots.application.use_cases import (
    GetSceneCoverageQuery,
    CreateSetupUseCase,
    CreateShotUseCase,
    CreateTakeUseCase,
    ListVfxShotsQuery,
    CreateVfxShotUseCase,
    UpdateVfxShotUseCase,
    UpdateVfxStatusUseCase,
    DeleteVfxShotUseCase,
)
from apps.shots.application.dtos import (
    CreateSetupCommand,
    CreateShotCommand,
    CreateTakeCommand,
    CreateVfxShotCommand,
    UpdateVfxShotCommand,
)
from apps.shots.infrastructure.django_shots_repository import (
    DjangoShotsRepository,
    DjangoVfxRepository,
)

shots_router = Router(tags=["Shots & Coverage"])
vfx_router = Router(tags=["VFX Pipeline"])

# ---------------------------------------------------------------------------
# SCHEMAS: Shots & Coverage
# ---------------------------------------------------------------------------

class TakeOut(Schema):
    id: uuid.UUID
    shot_id: uuid.UUID
    take_number: int
    is_circle_take: bool
    duration_seconds: Optional[int]
    director_notes: str
    created_at: Any

class TakeIn(Schema):
    shot_id: uuid.UUID
    take_number: int
    is_circle_take: bool = False
    duration_seconds: Optional[int] = None
    director_notes: str = ""

class ShotOut(Schema):
    id: uuid.UUID
    setup_id: uuid.UUID
    shot_code: str
    shot_size: str
    lens: Optional[str]
    description: str
    vfx_required: bool
    created_at: Any
    takes: List[TakeOut] = []

class ShotIn(Schema):
    setup_id: uuid.UUID
    shot_code: str
    shot_size: str
    lens: Optional[str] = None
    description: str = ""
    vfx_required: bool = False

class CameraSetupOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    setup_code: str
    camera_movement: str
    equipment_notes: str
    created_at: Any
    shots: List[ShotOut] = []

class CameraSetupIn(Schema):
    scene_id: uuid.UUID
    setup_code: str
    camera_movement: str
    equipment_notes: str = ""

class SceneCoverageOut(Schema):
    scene_id: uuid.UUID
    setups: List[CameraSetupOut] = []

# ---------------------------------------------------------------------------
# SCHEMAS: VFX
# ---------------------------------------------------------------------------

class VfxShotOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int
    vendor_name: str

class VfxShotIn(Schema):
    scene_id: uuid.UUID
    vfx_id: str
    status: str
    description: str
    frame_count: int = 0
    vendor_name: str = ""

class VfxStatusUpdateIn(Schema):
    status: str


# ---------------------------------------------------------------------------
# ENDPOINTS: Shots & Coverage
# ---------------------------------------------------------------------------

def _get_shots_repo():
    return DjangoShotsRepository()

def _get_vfx_repo():
    return DjangoVfxRepository()

@shots_router.get("/scenes/{scene_id}/coverage", response=SceneCoverageOut)
def get_scene_setups(request, scene_id: uuid.UUID):
    q = GetSceneCoverageQuery(_get_shots_repo())
    cov = q.execute(scene_id)
    return SceneCoverageOut(
        scene_id=cov.scene_id,
        setups=[
            CameraSetupOut(
                id=s.id,
                scene_id=s.scene_id,
                setup_code=s.setup_code,
                camera_movement=s.camera_movement,
                equipment_notes=s.equipment_notes,
                created_at=s.created_at,
                shots=[
                    ShotOut(
                        id=sh.id,
                        setup_id=sh.setup_id,
                        shot_code=sh.shot_code,
                        shot_size=sh.shot_size,
                        lens=sh.lens,
                        description=sh.description,
                        vfx_required=sh.vfx_required,
                        created_at=sh.created_at,
                        takes=[
                            TakeOut(
                                id=t.id,
                                shot_id=t.shot_id,
                                take_number=t.take_number,
                                is_circle_take=t.is_circle_take,
                                duration_seconds=t.duration_seconds,
                                director_notes=t.director_notes,
                                created_at=t.created_at,
                            )
                            for t in sh.takes
                        ],
                    )
                    for sh in s.shots
                ],
            )
            for s in cov.setups
        ],
    )

@shots_router.post("/setups", response=CameraSetupOut)
def create_setup(request, payload: CameraSetupIn):
    uc = CreateSetupUseCase(_get_shots_repo())
    cmd = CreateSetupCommand(
        scene_id=payload.scene_id,
        setup_code=payload.setup_code,
        camera_movement=payload.camera_movement,
        equipment_notes=payload.equipment_notes,
    )
    dto = uc.execute(cmd)
    return CameraSetupOut(
        id=dto.id,
        scene_id=dto.scene_id,
        setup_code=dto.setup_code,
        camera_movement=dto.camera_movement,
        equipment_notes=dto.equipment_notes,
        created_at=dto.created_at,
        shots=[],
    )

@shots_router.post("/shots", response=ShotOut)
def create_shot(request, payload: ShotIn):
    uc = CreateShotUseCase(_get_shots_repo())
    cmd = CreateShotCommand(
        setup_id=payload.setup_id,
        shot_code=payload.shot_code,
        shot_size=payload.shot_size,
        lens=payload.lens,
        description=payload.description,
        vfx_required=payload.vfx_required,
    )
    dto = uc.execute(cmd)
    return ShotOut(
        id=dto.id,
        setup_id=dto.setup_id,
        shot_code=dto.shot_code,
        shot_size=dto.shot_size,
        lens=dto.lens,
        description=dto.description,
        vfx_required=dto.vfx_required,
        created_at=dto.created_at,
        takes=[],
    )

@shots_router.post("/takes", response=TakeOut)
def create_take(request, payload: TakeIn):
    uc = CreateTakeUseCase(_get_shots_repo())
    cmd = CreateTakeCommand(
        shot_id=payload.shot_id,
        take_number=payload.take_number,
        is_circle_take=payload.is_circle_take,
        duration_seconds=payload.duration_seconds,
        director_notes=payload.director_notes,
    )
    dto = uc.execute(cmd)
    return TakeOut(
        id=dto.id,
        shot_id=dto.shot_id,
        take_number=dto.take_number,
        is_circle_take=dto.is_circle_take,
        duration_seconds=dto.duration_seconds,
        director_notes=dto.director_notes,
        created_at=dto.created_at,
    )


# ---------------------------------------------------------------------------
# ENDPOINTS: VFX Pipeline
# ---------------------------------------------------------------------------

@vfx_router.get("/projects/{project_id}/shots", response=List[VfxShotOut])
def list_vfx_shots(request, project_id: uuid.UUID):
    q = ListVfxShotsQuery(_get_vfx_repo())
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

@vfx_router.post("/projects/{project_id}/shots", response=VfxShotOut)
def create_vfx_shot(request, project_id: uuid.UUID, payload: VfxShotIn):
    uc = CreateVfxShotUseCase(_get_vfx_repo())
    cmd = CreateVfxShotCommand(
        scene_id=payload.scene_id,
        vfx_id=payload.vfx_id,
        status=payload.status,
        description=payload.description,
        frame_count=payload.frame_count,
        vendor_name=payload.vendor_name,
    )
    dto = uc.execute(project_id, cmd)
    return VfxShotOut(
        id=dto.id,
        scene_id=dto.scene_id,
        vfx_id=dto.vfx_id,
        status=dto.status,
        description=dto.description,
        frame_count=dto.frame_count,
        vendor_name=dto.vendor_name,
    )

@vfx_router.patch("/shots/{shot_id}", response=VfxShotOut)
def update_vfx_shot(request, shot_id: uuid.UUID, payload: VfxShotIn):
    uc = UpdateVfxShotUseCase(_get_vfx_repo())
    cmd = UpdateVfxShotCommand(
        vfx_id=payload.vfx_id,
        status=payload.status,
        description=payload.description,
        frame_count=payload.frame_count,
        vendor_name=payload.vendor_name,
    )
    dto = uc.execute(shot_id, cmd)
    return VfxShotOut(
        id=dto.id,
        scene_id=dto.scene_id,
        vfx_id=dto.vfx_id,
        status=dto.status,
        description=dto.description,
        frame_count=dto.frame_count,
        vendor_name=dto.vendor_name,
    )

@vfx_router.patch("/shots/{shot_id}/status", response=VfxShotOut)
def update_vfx_shot_status(request, shot_id: uuid.UUID, payload: VfxStatusUpdateIn):
    uc = UpdateVfxStatusUseCase(_get_vfx_repo())
    dto = uc.execute(shot_id, payload.status)
    return VfxShotOut(
        id=dto.id,
        scene_id=dto.scene_id,
        vfx_id=dto.vfx_id,
        status=dto.status,
        description=dto.description,
        frame_count=dto.frame_count,
        vendor_name=dto.vendor_name,
    )

@vfx_router.delete("/shots/{shot_id}")
def delete_vfx_shot(request, shot_id: uuid.UUID):
    uc = DeleteVfxShotUseCase(_get_vfx_repo())
    uc.execute(shot_id)
    return {"success": True}
