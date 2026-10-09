from typing import Protocol, List
from apps.core.media.application.dtos import MediaAssetDTO

class IMediaRepository(Protocol):
    def save_asset(self, app_label: str, model_name: str, object_id: str, file_url: str, file_type: str) -> MediaAssetDTO:
        ...

    def list_assets(self, app_label: str, model_name: str, object_id: str) -> List[MediaAssetDTO]:
        ...

class IMediaStoragePort(Protocol):
    def save_file(self, file_path: str, file_obj) -> str:
        ...

    def get_url(self, saved_path: str) -> str:
        ...
