import uuid
from typing import List, Any
from ninja import Router, Schema, File
from ninja.files import UploadedFile

from apps.core.media.application.use_cases import UploadMediaAssetUseCase, GetMediaAssetsQuery
from apps.core.media.infrastructure.django_media_repository import (
    DjangoMediaRepository,
    DjangoStorageAdapter,
)

media_router = Router(tags=["Universal Media Connector"])

class MediaAssetOut(Schema):
    id: uuid.UUID
    file_url: str
    file_type: str
    object_id: str
    uploaded_at: Any

def _get_use_cases():
    repo = DjangoMediaRepository()
    storage = DjangoStorageAdapter()
    return UploadMediaAssetUseCase(repo, storage), GetMediaAssetsQuery(repo)

@media_router.post("/upload", response=MediaAssetOut)
def upload_media(request, app_label: str, model_name: str, object_id: str, file: UploadedFile = File(...)):
    upload_uc, _ = _get_use_cases()
    dto = upload_uc.execute(app_label, model_name, object_id, file)
    return MediaAssetOut(
        id=dto.id,
        file_url=dto.file_url,
        file_type=dto.file_type,
        object_id=dto.object_id,
        uploaded_at=dto.uploaded_at,
    )

@media_router.get("/{app_label}/{model_name}/{object_id}", response=List[MediaAssetOut])
def get_media_assets(request, app_label: str, model_name: str, object_id: str):
    _, get_query = _get_use_cases()
    dtos = get_query.execute(app_label, model_name, object_id)
    return [
        MediaAssetOut(
            id=d.id,
            file_url=d.file_url,
            file_type=d.file_type,
            object_id=d.object_id,
            uploaded_at=d.uploaded_at,
        )
        for d in dtos
    ]
