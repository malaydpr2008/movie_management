"""
AI Copilot Application Use Cases.
"""
import os
import uuid
from typing import Dict, Any, List, Optional
from django.conf import settings
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.core.models import BackgroundJob
from apps.narrative.models import Project, Scene
from apps.breakdown.models import Character
from apps.core.ai.api.schemas import ChatHistoryIn, ApproveBreakdownIn
from apps.core.application.ports.object_storage import IObjectStorage
from apps.core.infrastructure.storage.django_s3_storage_adapter import DjangoS3StorageAdapter
from apps.core.application.ports.cache import ICacheService
from apps.core.infrastructure.cache.django_cache_adapter import DjangoCacheAdapter


def save_temp_image(file: UploadedFile, request) -> Dict[str, str]:
    upload_dir = os.path.join(settings.MEDIA_ROOT, "temp_ai_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = os.path.splitext(file.name)[1]
    file_name = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb+") as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    absolute_media_url = request.build_absolute_uri(
        f"{settings.MEDIA_URL}temp_ai_uploads/{file_name}"
    )
    return {"image_url": absolute_media_url}


def chat_with_universal_agent(project_id: str, payload: ChatHistoryIn) -> Dict[str, str]:
    try:
        from apps.core.studio_agent import chat_with_agent

        # Look for image_url in the last message
        last_msg = payload.messages[-1]
        if last_msg.image_url:
            last_msg.content += f"\n\nImage URL: {last_msg.image_url}"

        response_string = chat_with_agent(payload.messages, project_id)
        return {"reply": response_string}
    except Exception as e:
        raise HttpError(500, str(e))


def list_background_jobs() -> Dict[str, List[Dict[str, Any]]]:
    jobs = BackgroundJob.objects.all().order_by("-created_at")[:50]
    return {
        "jobs": [
            {
                "id": str(j.id),
                "task_name": j.task_name,
                "status": j.status,
                "result": j.result,
                "error_message": j.error_message,
                "created_at": j.created_at.isoformat(),
            }
            for j in jobs
        ]
    }


def get_pending_breakdown(
    project_id: str,
    cache_service: Optional[ICacheService] = None
) -> Dict[str, Any]:
    cache = cache_service or DjangoCacheAdapter()
    data = cache.get(f"pending_breakdown_{project_id}")
    return {"data": data}


def approve_pending_breakdown(
    project_id: str,
    payload: ApproveBreakdownIn,
    cache_service: Optional[ICacheService] = None
) -> Dict[str, str]:
    try:
        project = Project.objects.get(id=project_id)
        for idx, scene_data in enumerate(payload.scenes):
            heading = scene_data.get("heading", "")
            synopsis = scene_data.get("synopsis", "")
            chars = scene_data.get("characters", [])

            int_ext = "EXT" if "EXT" in heading.upper() else "INT"
            time_of_day = "NIGHT" if "NIGHT" in heading.upper() else "DAY"
            set_name = (
                heading.replace("INT.", "")
                .replace("EXT.", "")
                .replace("- NIGHT", "")
                .replace("- DAY", "")
                .strip()
            )

            Scene.objects.create(
                scene_number=str(idx + 1),
                order_index=str(idx + 1),
                int_ext=int_ext,
                set_name=set_name,
                time_of_day=time_of_day,
                pages_eighths=8,
                pages_display="1",
                estimated_shoot_minutes=60,
                synopsis=synopsis,
            )

            for char_name in chars:
                Character.objects.get_or_create(
                    project=project,
                    name=char_name,
                    defaults={"cast_id_number": 0, "actor_name": ""},
                )

        cache = cache_service or DjangoCacheAdapter()
        cache.delete(f"pending_breakdown_{project_id}")
        return {"status": "success"}
    except Exception as e:
        raise HttpError(500, str(e))


def list_storage_assets(
    storage: Optional[IObjectStorage] = None
) -> Dict[str, Any]:
    """
    List storage assets using IObjectStorage port.
    Decoupled from boto3, MinIO bucket names, and endpoint configuration.
    """
    try:
        store = storage or DjangoS3StorageAdapter()
        files = store.list_files()
        return {
            "files": [
                {
                    "key": f.key,
                    "size": f.size,
                    "last_modified": f.last_modified,
                    "url": f.url,
                }
                for f in files
            ]
        }
    except Exception as e:
        return {"error": str(e), "files": []}

