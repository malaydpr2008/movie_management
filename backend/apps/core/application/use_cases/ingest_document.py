"""
Core Application - Async Document Ingestion Use Case.
"""
from typing import Dict, Any, Optional
import logging
from apps.core.application.ports.vector_search import IVectorSearch
from apps.core.infrastructure.vector.qdrant_vector_adapter import QdrantVectorAdapter
from apps.core.vector_store import ingest_document

logger = logging.getLogger(__name__)


class IngestDocumentUseCase:
    """
    Orchestrates ingestion of media documents into vector search storage.
    Depends on IVectorSearch port rather than Qdrant directly.
    """

    def __init__(self, vector_service: Optional[IVectorSearch] = None):
        self.vector_service = vector_service

    def execute(self, file_url: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Executing document ingestion for {file_url}")
        if self.vector_service is not None:
            chunks_indexed = self.vector_service.index_document(file_url, metadata)
        else:
            chunks_indexed = ingest_document(file_url, metadata)
        logger.info(f"Successfully ingested {file_url} ({chunks_indexed} chunks)")
        return {"status": "success", "file": file_url}


