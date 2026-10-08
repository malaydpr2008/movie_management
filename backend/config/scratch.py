
class StrictShotOut(Schema):
    id: uuid.UUID
    scene_id: uuid.UUID
    shot_size: str
    camera_movement: str
    lens: Optional[str] = None
    description: str
    estimated_setup_time: int
    vfx_required: bool
    created_at: Any

class StrictShotIn(Schema):
    shot_size: str
    camera_movement: str
    lens: Optional[str] = None
    description: str
    estimated_setup_time: int = 15
    vfx_required: bool = False

@narrative_router.get("/projects/{project_id}/scenes/{scene_id}/shots", response=List[StrictShotOut])
def get_strict_shots(request, project_id: uuid.UUID, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id, sequence__act__project_id=project_id)
    shots = scene.shots.all().order_by('created_at')
    return [
        StrictShotOut(
            id=s.id,
            scene_id=s.scene_id,
            shot_size=s.shot_size,
            camera_movement=s.camera_movement,
            lens=s.lens,
            description=s.description,
            estimated_setup_time=s.estimated_setup_time,
            vfx_required=s.vfx_required,
            created_at=s.created_at
        ) for s in shots
    ]

@narrative_router.post("/projects/{project_id}/scenes/{scene_id}/shots", response=StrictShotOut)
def create_strict_shot(request, project_id: uuid.UUID, scene_id: uuid.UUID, payload: StrictShotIn):
    scene = get_object_or_404(Scene, id=scene_id, sequence__act__project_id=project_id)
    from apps.shots.models import Shot
    shot = Shot.objects.create(
        scene=scene,
        shot_size=payload.shot_size,
        camera_movement=payload.camera_movement,
        lens=payload.lens,
        description=payload.description,
        estimated_setup_time=payload.estimated_setup_time,
        vfx_required=payload.vfx_required
    )
    return StrictShotOut(
        id=shot.id,
        scene_id=shot.scene_id,
        shot_size=shot.shot_size,
        camera_movement=shot.camera_movement,
        lens=shot.lens,
        description=shot.description,
        estimated_setup_time=shot.estimated_setup_time,
        vfx_required=shot.vfx_required,
        created_at=shot.created_at
    )
