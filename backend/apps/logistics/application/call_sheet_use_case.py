"""
Logistics Application - Generate Call Sheet PDF Use Case.
"""
from typing import Dict, Any, Optional
from apps.logistics.models import ShootDay
from apps.core.application.ports.object_storage import IObjectStorage
from apps.core.infrastructure.storage.django_s3_storage_adapter import DjangoS3StorageAdapter
from apps.logistics.application.ports import ICallSheetPdfRenderer
from apps.logistics.infrastructure.pdf.reportlab_call_sheet_renderer import ReportLabCallSheetRenderer
from apps.core.application.ports.event_publisher import IEventPublisher
from apps.core.infrastructure.events.channels_event_publisher import ChannelsEventPublisher
from apps.core.infrastructure.notifications import broadcast_studio_notification


class GenerateCallSheetPdfUseCase:
    """
    Orchestrates Call Sheet PDF rendering, storage persistence, and team notification.
    Depends on IObjectStorage, ICallSheetPdfRenderer, and IEventPublisher ports.
    """

    def __init__(
        self,
        storage: Optional[IObjectStorage] = None,
        pdf_renderer: Optional[ICallSheetPdfRenderer] = None,
        event_publisher: Optional[IEventPublisher] = None,
        notification_service=None,
    ):
        if storage is not None and not hasattr(storage, "save_file"):
            self.storage = DjangoS3StorageAdapter(storage)
        else:
            self.storage = storage or DjangoS3StorageAdapter()

        self.pdf_renderer = pdf_renderer or ReportLabCallSheetRenderer()
        self.event_publisher = event_publisher
        self.broadcast_notification = notification_service or broadcast_studio_notification

    def execute(self, shoot_day_id: str) -> Dict[str, Any]:
        shoot_day = ShootDay.objects.get(id=shoot_day_id)

        # 1. PDF Rendering via capability port
        pdf_bytes = self.pdf_renderer.render(
            day_number=shoot_day.day_number,
            calendar_date=shoot_day.calendar_date,
            general_crew_call=shoot_day.general_crew_call,
            hospital_address=shoot_day.hospital_address or "",
        )

        # 2. Object Storage Persistence (Idempotent: overwrite if exists)
        s3_path = f"call_sheets/call_sheet_day_{shoot_day.day_number}.pdf"
        if self.storage.exists(s3_path):
            self.storage.delete(s3_path)

        saved_path = self.storage.save_file(s3_path, pdf_bytes)
        file_url = self.storage.get_url(saved_path)

        # 3. Notification Event Publication via port or broadcaster
        if self.event_publisher:
            self.event_publisher.publish_notification(
                message=f"Call Sheet PDF generated for Day {shoot_day.day_number}!",
                level="success",
                action="call_sheet_ready",
            )
        else:
            self.broadcast_notification(
                message=f"Call Sheet PDF generated for Day {shoot_day.day_number}!",
                level="success",
                action="call_sheet_ready",
            )

        return {
            "saved_path": saved_path,
            "file_url": file_url,
            "day_number": shoot_day.day_number,
        }


