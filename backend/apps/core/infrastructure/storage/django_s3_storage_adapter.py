"""
Core Infrastructure - Object Storage Adapter using Django Storage & boto3.
Hides boto3 client, bucket policies, credentials, and S3 APIs behind IObjectStorage.
"""
from typing import List, Optional, BinaryIO
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from apps.core.application.ports.object_storage import IObjectStorage, StoredFileMetadata


class DjangoS3StorageAdapter(IObjectStorage):
    """
    Adapter implementing IObjectStorage.
    Uses Django's configured default_storage (S3/MinIO in production, local storage in dev/test).
    Encapsulates bucket initialization and S3 asset listing so application use cases remain decoupled.
    """

    def __init__(self, storage=None):
        self.storage = storage or default_storage

    def save_file(self, file_path: str, content: bytes | BinaryIO) -> str:
        if isinstance(content, bytes):
            file_obj = ContentFile(content)
        else:
            file_obj = content
        return self.storage.save(file_path, file_obj)

    def get_url(self, file_path: str) -> str:
        return self.storage.url(file_path)

    def exists(self, file_path: str) -> bool:
        return self.storage.exists(file_path)

    def delete(self, file_path: str) -> bool:
        if self.storage.exists(file_path):
            self.storage.delete(file_path)
            return True
        return False

    def list_files(self, prefix: str = "") -> List[StoredFileMetadata]:
        """
        List objects from S3/MinIO bucket.
        Encapsulates boto3 client creation, bucket validation, and S3 object mapping.
        """
        files: List[StoredFileMetadata] = []
        try:
            import boto3
            from botocore.exceptions import ClientError

            endpoint_url = getattr(settings, "AWS_S3_ENDPOINT_URL", "http://localhost:9000")
            bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "cineflow-media")
            access_key = getattr(settings, "AWS_ACCESS_KEY_ID", "minioadmin")
            secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", "minioadmin")

            s3 = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
            )

            # Ensure bucket exists
            try:
                s3.head_bucket(Bucket=bucket_name)
            except ClientError:
                try:
                    s3.create_bucket(Bucket=bucket_name)
                except Exception:
                    pass

            kwargs = {"Bucket": bucket_name}
            if prefix:
                kwargs["Prefix"] = prefix

            objects = s3.list_objects_v2(**kwargs)
            if "Contents" in objects:
                for obj in objects["Contents"]:
                    files.append(
                        StoredFileMetadata(
                            key=obj["Key"],
                            size=obj["Size"],
                            last_modified=obj["LastModified"].isoformat(),
                            url=f"http://localhost:9000/{bucket_name}/{obj['Key']}",
                        )
                    )
        except Exception:
            # Fallback when running without a live S3/MinIO service (e.g. SQLite / local tests)
            pass
        return files
