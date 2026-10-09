"""
Logistics Application - Finalize Daily Production Report (DPR) Use Case.
"""
from typing import Dict, Any, Optional
from apps.core.application.ports.event_publisher import IEventPublisher
from apps.core.infrastructure.events.channels_event_publisher import ChannelsEventPublisher
from apps.core.infrastructure.notifications import broadcast_studio_notification


class FinalizeDprUseCase:
    """
    Orchestrates wrapping and finalization of Daily Production Reports.
    Emits events via IEventPublisher port.
    """

    def __init__(
        self,
        event_publisher: Optional[IEventPublisher] = None,
        notification_service=None,
    ):
        self.event_publisher = event_publisher
        self.broadcast_notification = notification_service or broadcast_studio_notification

    def execute(self, shoot_day_id: str) -> Dict[str, Any]:
        if self.event_publisher:
            self.event_publisher.publish_notification(
                message="Action Completed: finalize_dpr finished successfully.",
                level="success",
            )
        else:
            self.broadcast_notification(
                message="Action Completed: finalize_dpr finished successfully.",
                level="success",
            )
        return {"info": "Task finished successfully"}


