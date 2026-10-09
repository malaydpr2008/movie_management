from dataclasses import dataclass
from typing import Any
import uuid

@dataclass(frozen=True)
class MediaAssetDTO:
    id: uuid.UUID
    file_url: str
    file_type: str
    object_id: str
    uploaded_at: Any
