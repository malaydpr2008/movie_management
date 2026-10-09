"""
Core Application Port - Event Publisher.
Decouples domain/application events from Django Channels or transport mechanisms.
"""
from typing import Protocol, Optional, Dict, Any
from dataclasses import dataclass


@dataclass(frozen=True)
class StudioNotificationEvent:
    """Standardized event envelope for studio notifications."""
    message: str
    level: str = "info"
    action: Optional[str] = None


class IEventPublisher(Protocol):
    """
    Port for publishing application and domain events over real-time streams.
    Channels implements the concrete transport adapter.
    """

    def publish_notification(
        self,
        message: str,
        level: str = "info",
        action: Optional[str] = None
    ) -> None:
        """
        Publish a notification event to the studio notification stream.
        """
        ...

    def publish_project_event(
        self,
        project_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> None:
        """
        Publish a domain mutation event to a project-scoped room.
        """
        ...
