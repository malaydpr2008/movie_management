from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.narrative.models import Project
from apps.breakdown.models import CostumeLook
from apps.shots.models import Shot
from apps.core.tasks import async_ingest_document
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Project)
def project_document_ingestion(sender, instance, created, **kwargs):
    try:
        if hasattr(instance, 'poster') and instance.poster:
            file_url = instance.poster.url
            async_ingest_document.delay(
                file_url,
                metadata={"project_id": str(instance.id), "type": "Project", "id": str(instance.id)}
            )
    except Exception as e:
        logger.error(f"Error in project_document_ingestion signal: {e}")

@receiver(post_save, sender=CostumeLook)
def costume_document_ingestion(sender, instance, created, **kwargs):
    try:
        if hasattr(instance, 'continuity_photo') and instance.continuity_photo:
            file_url = instance.continuity_photo.url
            async_ingest_document.delay(
                file_url,
                metadata={"project_id": str(instance.character.project_id), "type": "CostumeLook", "id": str(instance.id)}
            )
    except Exception as e:
        logger.error(f"Error in costume_document_ingestion signal: {e}")

@receiver(post_save, sender=Shot)
def shot_document_ingestion(sender, instance, created, **kwargs):
    try:
        if hasattr(instance, 'storyboard_frame') and instance.storyboard_frame:
            file_url = instance.storyboard_frame.url
            async_ingest_document.delay(
                file_url,
                metadata={"project_id": str(instance.camera_setup.scene.project_id), "type": "Shot", "id": str(instance.id)}
            )
    except Exception as e:
        logger.error(f"Error in shot_document_ingestion signal: {e}")
