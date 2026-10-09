"""
Core Celery Tasks - Infrastructure / Transport Adapters.
"""
import logging
from celery import shared_task
from apps.core.application.use_cases.ingest_document import IngestDocumentUseCase

logger = logging.getLogger(__name__)


@shared_task
def async_ingest_document(file_url: str, metadata: dict):
    """
    Celery task adapter for document vector ingestion.
    Delegates domain orchestration to IngestDocumentUseCase.
    """
    try:
        use_case = IngestDocumentUseCase()
        return use_case.execute(file_url=file_url, metadata=metadata)
    except Exception as e:
        logger.error(f"Failed to ingest document {file_url}: {str(e)}")
        return {"status": "error", "error": str(e)}
