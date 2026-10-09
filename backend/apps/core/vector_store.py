"""
Core Vector Store module.
Provides backward-compatible bridge delegating to QdrantVectorAdapter.
"""
from apps.core.infrastructure.vector.qdrant_vector_adapter import QdrantVectorAdapter

_default_adapter = QdrantVectorAdapter()


def get_vector_store():
    return _default_adapter._get_vector_store()


def ingest_document(file_url: str, metadata: dict):
    """
    Downloads a document from MinIO (or any URL), extracts text, chunks it, and ingests into Qdrant.
    Delegates to QdrantVectorAdapter infrastructure adapter.
    """
    return _default_adapter.index_document(file_url, metadata)

