from typing import List
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType

from apps.core.models import MediaAsset
from apps.core.media.application.dtos import MediaAssetDTO
from apps.core.media.application.ports import IMediaRepository, IMediaStoragePort

class DjangoMediaRepository(IMediaRepository):
    """Django ORM adapter for MediaAsset persistence."""

    def save_asset(self, app_label: str, model_name: str, object_id: str, file_url: str, file_type: str) -> MediaAssetDTO:
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model_name)
        asset = MediaAsset.objects.create(
            file_url=file_url,
            file_type=file_type,
            content_type=content_type,
            object_id=object_id,
        )
        return MediaAssetDTO(
            id=asset.id,
            file_url=asset.file_url,
            file_type=asset.file_type,
            object_id=asset.object_id,
            uploaded_at=asset.uploaded_at,
        )

    def list_assets(self, app_label: str, model_name: str, object_id: str) -> List[MediaAssetDTO]:
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model_name)
        assets = MediaAsset.objects.filter(content_type=content_type, object_id=object_id).order_by('-uploaded_at')
        return [
            MediaAssetDTO(
                id=a.id,
                file_url=a.file_url,
                file_type=a.file_type,
                object_id=a.object_id,
                uploaded_at=a.uploaded_at,
            )
            for a in assets
        ]

from apps.core.infrastructure.storage.django_s3_storage_adapter import DjangoS3StorageAdapter

class DjangoStorageAdapter(IMediaStoragePort):
    """Storage adapter using DjangoS3StorageAdapter (S3/MinIO in production, local in tests)."""

    def __init__(self, object_storage=None):
        self._storage = object_storage or DjangoS3StorageAdapter()

    def save_file(self, file_path: str, file_obj) -> str:
        return self._storage.save_file(file_path, file_obj)

    def get_url(self, saved_path: str) -> str:
        return self._storage.get_url(saved_path)

