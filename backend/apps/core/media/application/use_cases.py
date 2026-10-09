import uuid
from typing import List
from apps.core.media.application.dtos import MediaAssetDTO
from apps.core.media.application.ports import IMediaRepository, IMediaStoragePort
from apps.core.media.domain import classify_media_type

class UploadMediaAssetUseCase:
    """Use case to handle file upload, classification, storage, and persistence."""

    def __init__(self, repository: IMediaRepository, storage: IMediaStoragePort):
        self.repository = repository
        self.storage = storage

    def execute(self, app_label: str, model_name: str, object_id: str, file_obj) -> MediaAssetDTO:
        file_path = f"studio-media/{app_label}/{model_name}/{object_id}/{uuid.uuid4()}_{file_obj.name}"
        saved_path = self.storage.save_file(file_path, file_obj)
        file_url = self.storage.get_url(saved_path)
        file_type = classify_media_type(file_obj.name)

        return self.repository.save_asset(
            app_label=app_label,
            model_name=model_name,
            object_id=object_id,
            file_url=file_url,
            file_type=file_type,
        )

class GetMediaAssetsQuery:
    """Query use case to retrieve media assets for an entity."""

    def __init__(self, repository: IMediaRepository):
        self.repository = repository

    def execute(self, app_label: str, model_name: str, object_id: str) -> List[MediaAssetDTO]:
        return self.repository.list_assets(app_label, model_name, object_id)
