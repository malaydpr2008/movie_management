"""
Core Application Port - Object Storage.
Hides boto3, MinIO, S3 buckets, keys, and credentials behind an object storage capability.
"""
from typing import Protocol, List, Optional, BinaryIO
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFileMetadata:
    """Metadata representing a file stored in object storage."""
    key: str
    size: int
    last_modified: str
    url: str


class IObjectStorage(Protocol):
    """
    Port for object storage operations.
    Application and domain code depend on this interface rather than boto3 or vendor SDKs.
    """

    def save_file(self, file_path: str, content: bytes | BinaryIO) -> str:
        """
        Persist content to object storage and return the saved path/key.
        """
        ...

    def get_url(self, file_path: str) -> str:
        """
        Retrieve accessible URL for a stored object.
        """
        ...

    def exists(self, file_path: str) -> bool:
        """
        Check if object exists at the given path/key.
        """
        ...

    def delete(self, file_path: str) -> bool:
        """
        Delete object at the given path/key.
        """
        ...

    def list_files(self, prefix: str = "") -> List[StoredFileMetadata]:
        """
        List stored files matching an optional prefix.
        """
        ...
