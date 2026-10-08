
shots_router = Router(tags=["Shots & Coverage"])

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

@shots_router.get("/scenes/{scene_id}/setups", response=SceneCoverageOut)
def get_scene_setups(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id)
    from apps.shots.models import CameraSetup
    setups = CameraSetup.objects.filter(scene=scene).prefetch_related('shots__takes').order_by('setup_code')
    
    setups_out = []
    for setup in setups:
        shots_out = []
        for shot in setup.shots.order_by('shot_code'):
            takes_out = [
                TakeOut(
                    id=t.id,
                    shot_id=shot.id,
                    take_number=t.take_number,
                    is_circle_take=t.is_circle_take,
                    duration_seconds=t.duration_seconds,
                    director_notes=t.director_notes,
                    created_at=t.created_at
                )
                for t in shot.takes.all()
            ]
            shots_out.append(
                ShotOut(
                    id=shot.id,
                    setup_id=setup.id,
                    shot_code=shot.shot_code,
                    shot_size=shot.shot_size,
                    lens=shot.lens,
                    description=shot.description,
                    vfx_required=shot.vfx_required,
                    created_at=shot.created_at,
                    takes=takes_out
                )
            )
        setups_out.append(
            CameraSetupOut(
                id=setup.id,
                scene_id=scene.id,
                setup_code=setup.setup_code,
                camera_movement=setup.camera_movement,
                equipment_notes=setup.equipment_notes,
                created_at=setup.created_at,
                shots=shots_out
            )
        )
    return SceneCoverageOut(scene_id=scene.id, setups=setups_out)

@shots_router.post("/setups", response=CameraSetupOut)
def create_setup(request, payload: CameraSetupIn):
    scene = get_object_or_404(Scene, id=payload.scene_id)
    from apps.shots.models import CameraSetup
    setup = CameraSetup.objects.create(
        scene=scene,
        setup_code=payload.setup_code,
        camera_movement=payload.camera_movement,
        equipment_notes=payload.equipment_notes
    )
    return CameraSetupOut(
        id=setup.id,
        scene_id=scene.id,
        setup_code=setup.setup_code,
        camera_movement=setup.camera_movement,
        equipment_notes=setup.equipment_notes,
        created_at=setup.created_at,
        shots=[]
    )

@shots_router.post("/shots", response=ShotOut)
def create_shot(request, payload: ShotIn):
    from apps.shots.models import CameraSetup, Shot
    setup = get_object_or_404(CameraSetup, id=payload.setup_id)
    shot = Shot.objects.create(
        setup=setup,
        shot_code=payload.shot_code,
        shot_size=payload.shot_size,
        lens=payload.lens,
        description=payload.description,
        vfx_required=payload.vfx_required
    )
    return ShotOut(
        id=shot.id,
        setup_id=setup.id,
        shot_code=shot.shot_code,
        shot_size=shot.shot_size,
        lens=shot.lens,
        description=shot.description,
        vfx_required=shot.vfx_required,
        created_at=shot.created_at,
        takes=[]
    )

@shots_router.post("/takes", response=TakeOut)
def create_take(request, payload: TakeIn):
    from apps.shots.models import Shot, Take
    shot = get_object_or_404(Shot, id=payload.shot_id)
    take = Take.objects.create(
        shot=shot,
        take_number=payload.take_number,
        is_circle_take=payload.is_circle_take,
        duration_seconds=payload.duration_seconds,
        director_notes=payload.director_notes
    )
    return TakeOut(
        id=take.id,
        shot_id=shot.id,
        take_number=take.take_number,
        is_circle_take=take.is_circle_take,
        duration_seconds=take.duration_seconds,
        director_notes=take.director_notes,
        created_at=take.created_at
    )
