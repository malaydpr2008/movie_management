import uuid
from typing import Optional
from ninja.errors import HttpError

from apps.narrative.api.schemas import (
    SceneIn,
    SceneUpdateIn,
    SceneReorderIn,
    SceneTreeNode,
    SceneDetailOut,
)
from apps.narrative.application.dtos import (
    CreateSceneCommand,
    UpdateSceneCommand,
    ReorderSceneCommand,
    SceneDetailDTO,
    SceneTreeNodeDTO,
)
from apps.narrative.application.ports.scene_repository import ISceneRepository
from apps.narrative.application.use_cases import (
    CreateSceneUseCase,
    GetSceneDetailUseCase,
    UpdateSceneUseCase,
    ReorderSceneUseCase,
)
from apps.narrative.domain.exceptions import (
    SceneNotFoundError,
    SequenceNotFoundError,
    InvalidSceneDataError,
)
from apps.narrative.infrastructure.repositories import DjangoSceneRepository

def _get_default_repository(repository: Optional[ISceneRepository] = None) -> ISceneRepository:
    return repository if repository is not None else DjangoSceneRepository()

def create_scene_handler(payload: SceneIn, repository: Optional[ISceneRepository] = None) -> SceneTreeNode:
    """Handles POST /api/narrative/scenes HTTP requests."""
    repo = _get_default_repository(repository)
    use_case = CreateSceneUseCase(repo)

    command = CreateSceneCommand(
        sequence_id=payload.sequence_id,
        scene_number=payload.scene_number,
        order_index=payload.order_index or "0|hzzzzz:",
        int_ext=payload.int_ext,
        set_name=payload.set_name,
        time_of_day=payload.time_of_day,
        pages_eighths=payload.pages_eighths,
        estimated_shoot_minutes=payload.estimated_shoot_minutes,
        script_data=payload.script_data,
        synopsis=payload.synopsis,
    )

    try:
        dto: SceneTreeNodeDTO = use_case.execute(command)
        return SceneTreeNode(
            id=dto.id,
            sequence_id=dto.sequence_id,
            scene_number=dto.scene_number,
            order_index=dto.order_index,
            int_ext=dto.int_ext,
            set_name=dto.set_name,
            time_of_day=dto.time_of_day,
            pages_eighths=dto.pages_eighths,
            pages_display=dto.pages_display,
            estimated_shoot_minutes=dto.estimated_shoot_minutes,
            synopsis=dto.synopsis,
            setup_count=dto.setup_count,
            shot_count=dto.shot_count,
            take_count=dto.take_count,
            circle_take_count=dto.circle_take_count,
        )
    except SequenceNotFoundError as e:
        raise HttpError(404, str(e))
    except InvalidSceneDataError as e:
        raise HttpError(400, str(e))

def get_scene_detail_handler(scene_id: uuid.UUID, repository: Optional[ISceneRepository] = None) -> SceneDetailOut:
    """Handles GET /api/narrative/scenes/{scene_id} HTTP requests."""
    repo = _get_default_repository(repository)
    use_case = GetSceneDetailUseCase(repo)

    try:
        dto: SceneDetailDTO = use_case.execute(scene_id)
        return SceneDetailOut(
            id=dto.id,
            sequence_id=dto.sequence_id,
            sequence_title=dto.sequence_title,
            act_id=dto.act_id,
            act_title=dto.act_title,
            project_id=dto.project_id,
            scene_number=dto.scene_number,
            order_index=dto.order_index,
            int_ext=dto.int_ext,
            set_name=dto.set_name,
            time_of_day=dto.time_of_day,
            pages_eighths=dto.pages_eighths,
            pages_display=dto.pages_display,
            estimated_shoot_minutes=dto.estimated_shoot_minutes,
            script_data=dto.script_data,
            synopsis=dto.synopsis,
            setup_count=dto.setup_count,
            shot_count=dto.shot_count,
            take_count=dto.take_count,
        )
    except SceneNotFoundError as e:
        raise HttpError(404, str(e))

def update_scene_handler(scene_id: uuid.UUID, payload: SceneUpdateIn, repository: Optional[ISceneRepository] = None) -> SceneDetailOut:
    """Handles PATCH /api/narrative/scenes/{scene_id} HTTP requests."""
    repo = _get_default_repository(repository)
    use_case = UpdateSceneUseCase(repo)

    updated_fields = set(payload.dict(exclude_unset=True).keys())
    command = UpdateSceneCommand(
        scene_id=scene_id,
        sequence_id=payload.sequence_id,
        scene_number=payload.scene_number,
        order_index=payload.order_index,
        int_ext=payload.int_ext,
        set_name=payload.set_name,
        time_of_day=payload.time_of_day,
        pages_eighths=payload.pages_eighths,
        estimated_shoot_minutes=payload.estimated_shoot_minutes,
        script_data=payload.script_data,
        synopsis=payload.synopsis,
        updated_fields=updated_fields,
    )

    try:
        dto: SceneDetailDTO = use_case.execute(command)
        return SceneDetailOut(
            id=dto.id,
            sequence_id=dto.sequence_id,
            sequence_title=dto.sequence_title,
            act_id=dto.act_id,
            act_title=dto.act_title,
            project_id=dto.project_id,
            scene_number=dto.scene_number,
            order_index=dto.order_index,
            int_ext=dto.int_ext,
            set_name=dto.set_name,
            time_of_day=dto.time_of_day,
            pages_eighths=dto.pages_eighths,
            pages_display=dto.pages_display,
            estimated_shoot_minutes=dto.estimated_shoot_minutes,
            script_data=dto.script_data,
            synopsis=dto.synopsis,
            setup_count=dto.setup_count,
            shot_count=dto.shot_count,
            take_count=dto.take_count,
        )
    except SceneNotFoundError as e:
        raise HttpError(404, str(e))
    except SequenceNotFoundError as e:
        raise HttpError(404, str(e))
    except InvalidSceneDataError as e:
        raise HttpError(400, str(e))

def reorder_scene_handler(payload: SceneReorderIn, repository: Optional[ISceneRepository] = None) -> SceneTreeNode:
    """Handles POST /api/narrative/scenes/reorder HTTP requests."""
    repo = _get_default_repository(repository)
    use_case = ReorderSceneUseCase(repo)

    command = ReorderSceneCommand(
        scene_id=payload.scene_id,
        new_order_index=payload.new_order_index,
        target_sequence_id=payload.target_sequence_id,
    )

    try:
        dto: SceneTreeNodeDTO = use_case.execute(command)
        return SceneTreeNode(
            id=dto.id,
            sequence_id=dto.sequence_id,
            scene_number=dto.scene_number,
            order_index=dto.order_index,
            int_ext=dto.int_ext,
            set_name=dto.set_name,
            time_of_day=dto.time_of_day,
            pages_eighths=dto.pages_eighths,
            pages_display=dto.pages_display,
            estimated_shoot_minutes=dto.estimated_shoot_minutes,
            synopsis=dto.synopsis,
            setup_count=dto.setup_count,
            shot_count=dto.shot_count,
            take_count=dto.take_count,
            circle_take_count=dto.circle_take_count,
        )
    except SceneNotFoundError as e:
        raise HttpError(404, str(e))
    except SequenceNotFoundError as e:
        raise HttpError(404, str(e))
    except InvalidSceneDataError as e:
        raise HttpError(400, str(e))
