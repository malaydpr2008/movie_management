from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.narrative.models import Project
from apps.breakdown.models import CostumeLook
from apps.narrative.models import Shot
from apps.core.tasks import async_ingest_document

@receiver(post_save, sender=Project)
def project_document_ingestion(sender, instance, created, **kwargs):
    if instance.poster:
        # Assuming URL is accessible
        file_url = instance.poster.url
        async_ingest_document.delay(
            file_url,
            metadata={"project_id": str(instance.id), "type": "Project", "id": str(instance.id)}
        )

@receiver(post_save, sender=CostumeLook)
def costume_document_ingestion(sender, instance, created, **kwargs):
    if instance.continuity_photo:
        file_url = instance.continuity_photo.url
        async_ingest_document.delay(
            file_url,
            metadata={"project_id": str(instance.character.project_id), "type": "CostumeLook", "id": str(instance.id)}
        )

@receiver(post_save, sender=Shot)
def shot_document_ingestion(sender, instance, created, **kwargs):
    if instance.storyboard_frame:
        file_url = instance.storyboard_frame.url
        async_ingest_document.delay(
            file_url,
            metadata={"project_id": str(instance.camera_setup.scene.project_id), "type": "Shot", "id": str(instance.id)}
        )
