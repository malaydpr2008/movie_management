import uuid
from typing import Optional

from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.dtos import (
    CreateSceneCommand,
    UpdateSceneCommand,
    ReorderSceneCommand,
    SceneDetailDTO,
    SceneTreeNodeDTO,
)
from apps.narrative.domain.exceptions import (
    SceneNotFoundError,
    SequenceNotFoundError,
)
from apps.narrative.models import Scene, Sequence
from apps.shots.models import CameraSetup, Shot, Take

class DjangoSceneRepository(ISceneRepository):
    """
    Django ORM implementation of the ISceneRepository port.
    Encapsulates database access, query optimization, and model-to-DTO mappings.
    """

    def create(self, command: CreateSceneCommand) -> SceneTreeNodeDTO:
        target_seq = None
        if command.sequence_id is not None:
            target_seq = Sequence.objects.filter(id=command.sequence_id).first()
            if not target_seq:
                raise SequenceNotFoundError(command.sequence_id)

        scene = Scene.objects.create(
            sequence=target_seq,
            scene_number=command.scene_number,
            order_index=command.order_index or "0|hzzzzz:",
            int_ext=command.int_ext,
            set_name=command.set_name,
            time_of_day=command.time_of_day,
            pages_eighths=command.pages_eighths,
            estimated_shoot_minutes=command.estimated_shoot_minutes,
            script_data=command.script_data or {},
            synopsis=command.synopsis,
        )

        return SceneTreeNodeDTO(
            id=scene.id,
            sequence_id=scene.sequence_id,
            scene_number=scene.scene_number,
            order_index=scene.order_index,
            int_ext=scene.int_ext,
            set_name=scene.set_name,
            time_of_day=scene.time_of_day,
            pages_eighths=scene.pages_eighths,
            pages_display=scene.pages_display,
            estimated_shoot_minutes=scene.estimated_shoot_minutes,
            synopsis=scene.synopsis,
            setup_count=0,
            shot_count=0,
            take_count=0,
            circle_take_count=0,
        )

    def get_detail(self, scene_id: uuid.UUID) -> SceneDetailDTO:
        scene = Scene.objects.select_related('sequence__act__project').filter(id=scene_id).first()
        if not scene:
            raise SceneNotFoundError(scene_id)

        setup_count = CameraSetup.objects.filter(scene=scene).count()
        shot_count = Shot.objects.filter(setup__scene=scene).count()
        take_count = Take.objects.filter(shot__setup__scene=scene).count()

        seq = scene.sequence
        act = seq.act if seq else None
        proj = act.project if act else None

        return SceneDetailDTO(
            id=scene.id,
            sequence_id=seq.id if seq else None,
            sequence_title=seq.title if seq else None,
            act_id=act.id if act else None,
            act_title=act.title if act else None,
            project_id=proj.id if proj else None,
            scene_number=scene.scene_number,
            order_index=scene.order_index,
            int_ext=scene.int_ext,
            set_name=scene.set_name,
            time_of_day=scene.time_of_day,
            pages_eighths=scene.pages_eighths,
            pages_display=scene.pages_display,
            estimated_shoot_minutes=scene.estimated_shoot_minutes,
            script_data=scene.script_data or {},
            synopsis=scene.synopsis,
            setup_count=setup_count,
            shot_count=shot_count,
            take_count=take_count,
        )

    def update(self, command: UpdateSceneCommand) -> SceneDetailDTO:
        scene = Scene.objects.select_related('sequence__act__project').filter(id=command.scene_id).first()
        if not scene:
            raise SceneNotFoundError(command.scene_id)

        for field in command.updated_fields:
            if field == "sequence_id":
                if command.sequence_id is not None:
                    target_seq = Sequence.objects.filter(id=command.sequence_id).first()
                    if not target_seq:
                        raise SequenceNotFoundError(command.sequence_id)
                    scene.sequence = target_seq
                else:
                    scene.sequence = None
            else:
                setattr(scene, field, getattr(command, field))

        scene.save()
        return self.get_detail(scene.id)

    def reorder(self, command: ReorderSceneCommand) -> SceneTreeNodeDTO:
        scene = Scene.objects.filter(id=command.scene_id).first()
        if not scene:
            raise SceneNotFoundError(command.scene_id)

        if command.target_sequence_id is not None:
            target_seq = Sequence.objects.filter(id=command.target_sequence_id).first()
            if not target_seq:
                raise SequenceNotFoundError(command.target_sequence_id)
            scene.sequence = target_seq

        scene.order_index = command.new_order_index
        scene.save()

        setup_count = CameraSetup.objects.filter(scene=scene).count()
        shot_count = Shot.objects.filter(setup__scene=scene).count()
        take_count = Take.objects.filter(shot__setup__scene=scene).count()
        circle_take_count = Take.objects.filter(shot__setup__scene=scene, is_circle_take=True).count()

        return SceneTreeNodeDTO(
            id=scene.id,
            sequence_id=scene.sequence_id,
            scene_number=scene.scene_number,
            order_index=scene.order_index,
            int_ext=scene.int_ext,
            set_name=scene.set_name,
            time_of_day=scene.time_of_day,
            pages_eighths=scene.pages_eighths,
            pages_display=scene.pages_display,
            estimated_shoot_minutes=scene.estimated_shoot_minutes,
            synopsis=scene.synopsis,
            setup_count=setup_count,
            shot_count=shot_count,
            take_count=take_count,
            circle_take_count=circle_take_count,
        )
