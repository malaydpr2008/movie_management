"""
Core Infrastructure - Object Storage Adapters.
"""
from .django_s3_storage_adapter import DjangoS3StorageAdapter

__all__ = ["DjangoS3StorageAdapter"]
