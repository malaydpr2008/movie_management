from celery import shared_task
import logging
from apps.core.vector_store import ingest_document

logger = logging.getLogger(__name__)

@shared_task
def async_ingest_document(file_url: str, metadata: dict):
    try:
        logger.info(f"Starting async ingestion for {file_url}")
        ingest_document(file_url, metadata)
        logger.info(f"Successfully ingested {file_url}")
        return {"status": "success", "file": file_url}
    except Exception as e:
        logger.error(f"Failed to ingest document {file_url}: {str(e)}")
        return {"status": "error", "error": str(e)}
