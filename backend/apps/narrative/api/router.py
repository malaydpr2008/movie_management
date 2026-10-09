import uuid
from typing import List, Dict, Any
from django.shortcuts import get_object_or_404
from ninja import Router

from apps.narrative.models import Project, Act, Sequence, Scene, ADRCue
from apps.shots.models import CameraSetup, Shot, Take
from apps.narrative.services import parse_fountain_script
from apps.narrative.api.schemas import (
    ProjectTreeOut,
    ActTreeNode,
    SequenceTreeNode,
    SceneTreeNode,
    ActSequenceSummaryOut,
    ActDetailOut,
    ActUpdateIn,
    ActIn,
    SequenceDetailOut,
    SequenceUpdateIn,
    SequenceIn,
    SceneIn,
    SceneUpdateIn,
    SceneReorderIn,
    SceneDetailOut,
    ScriptImportIn,
    ADRCueOut,
    ADRCueIn,
    ADRCueStatusIn,
    StrictShotOut,
    StrictShotIn,
)
from apps.narrative.api.handlers import (
    create_scene_handler,
    get_scene_detail_handler,
    update_scene_handler,
    reorder_scene_handler,
)

narrative_router = Router(tags=["Narrative Tree & Outline"])

@narrative_router.post("/projects/{project_id}/import-script", response=Dict[str, Any])
def import_script(request, project_id: uuid.UUID, payload: ScriptImportIn):
    scene_count = parse_fountain_script(project_id, payload.script_text)
    return {"message": "Script parsed successfully", "scene_count": scene_count}

@narrative_router.get("/projects/{project_id}/tree", response=ProjectTreeOut)
def get_project_tree(request, project_id: uuid.UUID):
    project = get_object_or_404(Project, id=project_id)
    acts = project.acts.prefetch_related(
        'sequences__scenes__camera_setups__shots__takes'
    ).order_index_order() if hasattr(project.acts, 'order_index_order') else project.acts.order_by('order_index')

    acts_tree = []
    for act in acts:
        seqs_tree = []
        for seq in act.sequences.order_by('order_index'):
            scenes_tree = []
            for sc in seq.scenes.order_by('order_index'):
                setups = CameraSetup.objects.filter(scene=sc)
                shots = Shot.objects.filter(setup__scene=sc)
                setup_count = setups.count()
                shot_count = shots.count()
                take_count = Take.objects.filter(shot__setup__scene=sc).count()
                circle_take_count = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()
                scenes_tree.append(
                    SceneTreeNode(
                        id=sc.id,
                        sequence_id=seq.id,
                        scene_number=sc.scene_number,
                        order_index=sc.order_index,
                        int_ext=sc.int_ext,
                        set_name=sc.set_name,
                        time_of_day=sc.time_of_day,
                        pages_eighths=sc.pages_eighths,
                        pages_display=sc.pages_display,
                        estimated_shoot_minutes=sc.estimated_shoot_minutes,
                        synopsis=sc.synopsis,
                        setup_count=setup_count,
                        shot_count=shot_count,
                        take_count=take_count,
                        circle_take_count=circle_take_count
                    )
                )
            seqs_tree.append(
                SequenceTreeNode(
                    id=seq.id,
                    act_id=act.id,
                    title=seq.title,
                    order_index=seq.order_index,
                    color_tag=seq.color_tag,
                    dramatic_question=seq.dramatic_question,
                    temp_score_reference=seq.temp_score_reference,
                    continuity_notes=getattr(seq, 'continuity_notes', '') or '',
                    scenes=scenes_tree
                )
            )
        acts_tree.append(
            ActTreeNode(
                id=act.id,
                project_id=project.id,
                title=act.title,
                order_index=act.order_index,
                target_page_length=act.target_page_length,
                dramatic_milestone=act.dramatic_milestone,
                sequences=seqs_tree
            )
        )

    return ProjectTreeOut(
        id=project.id,
        title=project.title,
        slug=project.slug,
        aspect_ratio=project.aspect_ratio,
        target_runtime_minutes=project.target_runtime_minutes,
        acts=acts_tree
    )

# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------

@narrative_router.post("/scenes", response=SceneTreeNode)
def create_scene(request, payload: SceneIn):
    return create_scene_handler(payload)

@narrative_router.post("/scenes/reorder", response=SceneTreeNode)
def reorder_scene(request, payload: SceneReorderIn):
    return reorder_scene_handler(payload)

@narrative_router.get("/scenes/{scene_id}", response=SceneDetailOut)
def get_scene_detail(request, scene_id: uuid.UUID):
    return get_scene_detail_handler(scene_id)

@narrative_router.patch("/scenes/{scene_id}", response=SceneDetailOut)
def update_scene(request, scene_id: uuid.UUID, payload: SceneUpdateIn):
    return update_scene_handler(scene_id, payload)

@narrative_router.delete("/scenes/{scene_id}")
def delete_scene(request, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id)
    scene.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# Acts
# ---------------------------------------------------------------------------

@narrative_router.get("/acts/{act_id}", response=ActDetailOut)
def get_act_detail(request, act_id: uuid.UUID):
    act = get_object_or_404(Act.objects.select_related('project').prefetch_related('sequences__scenes'), id=act_id)
    sequences = act.sequences.order_by('order_index')

    total_scenes = 0
    actual_pages_eighths = 0
    int_count = 0
    ext_count = 0
    day_count = 0
    night_count = 0
    total_shoot_minutes = 0
    total_planned_shots = 0

    seqs_out = []
    for seq in sequences:
        scenes = seq.scenes.order_by('order_index')
        seq_scenes_out = []
        seq_eighths = 0
        seq_shots = 0

        for sc in scenes:
            sc_setups = CameraSetup.objects.filter(scene=sc).count()
            sc_shots = Shot.objects.filter(setup__scene=sc).count()
            sc_takes = Take.objects.filter(shot__setup__scene=sc).count()
            sc_circle = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()

            total_scenes += 1
            actual_pages_eighths += sc.pages_eighths
            seq_eighths += sc.pages_eighths
            total_shoot_minutes += sc.estimated_shoot_minutes
            total_planned_shots += sc_shots
            seq_shots += sc_shots

            if sc.int_ext == 'INT':
                int_count += 1
            elif sc.int_ext == 'EXT':
                ext_count += 1
            else:
                int_count += 1
                ext_count += 1

            if 'night' in sc.time_of_day.lower():
                night_count += 1
            else:
                day_count += 1

            seq_scenes_out.append(
                SceneTreeNode(
                    id=sc.id,
                    sequence_id=seq.id,
                    scene_number=sc.scene_number,
                    order_index=sc.order_index,
                    int_ext=sc.int_ext,
                    set_name=sc.set_name,
                    time_of_day=sc.time_of_day,
                    pages_eighths=sc.pages_eighths,
                    pages_display=sc.pages_display,
                    estimated_shoot_minutes=sc.estimated_shoot_minutes,
                    synopsis=sc.synopsis,
                    setup_count=sc_setups,
                    shot_count=sc_shots,
                    take_count=sc_takes,
                    circle_take_count=sc_circle,
                )
            )

        seqs_out.append(
            ActSequenceSummaryOut(
                id=seq.id,
                title=seq.title,
                order_index=seq.order_index,
                color_tag=seq.color_tag,
                dramatic_question=seq.dramatic_question,
                temp_score_reference=seq.temp_score_reference,
                continuity_notes=getattr(seq, 'continuity_notes', '') or '',
                scenes_count=len(scenes),
                pages_sum=round(seq_eighths / 8.0, 2),
                shot_count=seq_shots,
                scenes=seq_scenes_out,
            )
        )

    return ActDetailOut(
        id=act.id,
        project_id=act.project.id,
        project_title=act.project.title,
        title=act.title,
        order_index=act.order_index,
        target_page_length=act.target_page_length,
        dramatic_milestone=act.dramatic_milestone,
        total_scenes_count=total_scenes,
        actual_pages_sum=round(actual_pages_eighths / 8.0, 2),
        actual_pages_eighths=actual_pages_eighths,
        int_count=int_count,
        ext_count=ext_count,
        day_count=day_count,
        night_count=night_count,
        total_planned_shots=total_planned_shots,
        total_shoot_minutes=total_shoot_minutes,
        sequences=seqs_out,
    )

@narrative_router.patch("/acts/{act_id}", response=ActDetailOut)
def update_act(request, act_id: uuid.UUID, payload: ActUpdateIn):
    act = get_object_or_404(Act, id=act_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(act, field, val)
    act.save()
    return get_act_detail(request, act_id)

@narrative_router.post("/acts", response=ActTreeNode)
def create_act(request, payload: ActIn):
    project = get_object_or_404(Project, id=payload.project_id)
    act = Act.objects.create(
        project=project,
        title=payload.title,
        order_index=payload.order_index,
        target_page_length=payload.target_page_length,
        dramatic_milestone=payload.dramatic_milestone
    )
    return ActTreeNode(
        id=act.id,
        project_id=project.id,
        title=act.title,
        order_index=act.order_index,
        target_page_length=act.target_page_length,
        dramatic_milestone=act.dramatic_milestone,
        sequences=[]
    )

@narrative_router.delete("/acts/{act_id}")
def delete_act(request, act_id: uuid.UUID):
    act = get_object_or_404(Act, id=act_id)
    act.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# Sequences
# ---------------------------------------------------------------------------

@narrative_router.get("/sequences/{sequence_id}", response=SequenceDetailOut)
def get_sequence_detail(request, sequence_id: uuid.UUID):
    seq = get_object_or_404(
        Sequence.objects.select_related('act__project').prefetch_related('scenes'),
        id=sequence_id
    )
    scenes = seq.scenes.order_by('order_index')

    total_eighths = 0
    total_shots = 0
    scenes_out = []

    for sc in scenes:
        sc_setups = CameraSetup.objects.filter(scene=sc).count()
        sc_shots = Shot.objects.filter(setup__scene=sc).count()
        sc_takes = Take.objects.filter(shot__setup__scene=sc).count()
        sc_circle = Take.objects.filter(shot__setup__scene=sc, is_circle_take=True).count()

        total_eighths += sc.pages_eighths
        total_shots += sc_shots

        scenes_out.append(
            SceneTreeNode(
                id=sc.id,
                sequence_id=seq.id,
                scene_number=sc.scene_number,
                order_index=sc.order_index,
                int_ext=sc.int_ext,
                set_name=sc.set_name,
                time_of_day=sc.time_of_day,
                pages_eighths=sc.pages_eighths,
                pages_display=sc.pages_display,
                estimated_shoot_minutes=sc.estimated_shoot_minutes,
                synopsis=sc.synopsis,
                setup_count=sc_setups,
                shot_count=sc_shots,
                take_count=sc_takes,
                circle_take_count=sc_circle,
            )
        )

    act = seq.act
    proj = act.project

    return SequenceDetailOut(
        id=seq.id,
        act_id=act.id,
        act_title=act.title,
        project_id=proj.id,
        project_title=proj.title,
        title=seq.title,
        order_index=seq.order_index,
        color_tag=seq.color_tag,
        dramatic_question=seq.dramatic_question,
        temp_score_reference=seq.temp_score_reference,
        continuity_notes=getattr(seq, 'continuity_notes', '') or '',
        scenes_count=len(scenes),
        pages_sum=round(total_eighths / 8.0, 2),
        total_planned_shots=total_shots,
        scenes=scenes_out,
    )

@narrative_router.patch("/sequences/{sequence_id}", response=SequenceDetailOut)
def update_sequence(request, sequence_id: uuid.UUID, payload: SequenceUpdateIn):
    seq = get_object_or_404(Sequence, id=sequence_id)
    data = payload.dict(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(seq, field, val)
    seq.save()
    return get_sequence_detail(request, sequence_id)

@narrative_router.post("/sequences", response=SequenceTreeNode)
def create_sequence(request, payload: SequenceIn):
    act = get_object_or_404(Act, id=payload.act_id)
    seq = Sequence.objects.create(
        act=act,
        title=payload.title,
        order_index=payload.order_index,
        color_tag=payload.color_tag,
        dramatic_question=payload.dramatic_question,
        temp_score_reference=payload.temp_score_reference,
        continuity_notes=payload.continuity_notes or ''
    )
    return SequenceTreeNode(
        id=seq.id,
        act_id=act.id,
        title=seq.title,
        order_index=seq.order_index,
        color_tag=seq.color_tag,
        dramatic_question=seq.dramatic_question,
        temp_score_reference=seq.temp_score_reference,
        continuity_notes=getattr(seq, 'continuity_notes', '') or '',
        scenes=[]
    )

@narrative_router.delete("/sequences/{sequence_id}")
def delete_sequence(request, sequence_id: uuid.UUID):
    seq = get_object_or_404(Sequence, id=sequence_id)
    seq.delete()
    return {"success": True}

# ---------------------------------------------------------------------------
# ADR Cues
# ---------------------------------------------------------------------------

@narrative_router.get("/projects/{project_id}/scenes/{scene_id}/adr", response=List[ADRCueOut])
def get_adr_cues(request, project_id: uuid.UUID, scene_id: uuid.UUID):
    scene = get_object_or_404(Scene, id=scene_id, sequence__act__project_id=project_id)
    cues = scene.adr_cues.all().order_by('created_at')
    return [
        ADRCueOut(
            id=cue.id,
            scene_id=scene.id,
            character_name=cue.character_name,
            line_text=cue.line_text,
            timecode=cue.timecode,
            reason=cue.reason,
            status=cue.status,
            created_at=cue.created_at
        ) for cue in cues
    ]

@narrative_router.post("/projects/{project_id}/scenes/{scene_id}/adr", response=ADRCueOut)
def create_adr_cue(request, project_id: uuid.UUID, scene_id: uuid.UUID, payload: ADRCueIn):
    scene = get_object_or_404(Scene, id=scene_id, sequence__act__project_id=project_id)
    cue = ADRCue.objects.create(
        scene=scene,
        character_name=payload.character_name,
        line_text=payload.line_text,
        timecode=payload.timecode,
        reason=payload.reason
    )
    return ADRCueOut(
        id=cue.id,
        scene_id=scene.id,
        character_name=cue.character_name,
        line_text=cue.line_text,
        timecode=cue.timecode,
        reason=cue.reason,
        status=cue.status,
        created_at=cue.created_at
    )

@narrative_router.patch("/projects/{project_id}/adr/{cue_id}/status", response=ADRCueOut)
def update_adr_cue_status(request, project_id: uuid.UUID, cue_id: uuid.UUID, payload: ADRCueStatusIn):
    cue = get_object_or_404(ADRCue, id=cue_id, scene__sequence__act__project_id=project_id)
    cue.status = payload.status
    cue.save()
    return ADRCueOut(
        id=cue.id,
        scene_id=cue.scene_id,
        character_name=cue.character_name,
        line_text=cue.line_text,
        timecode=cue.timecode,
        reason=cue.reason,
        status=cue.status,
        created_at=cue.created_at
    )

# ---------------------------------------------------------------------------
# Strict Shots
# ---------------------------------------------------------------------------

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
