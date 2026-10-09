"""
Core Infrastructure - WebSocket notification publisher.
Provides backward-compatible bridge delegating to ChannelsEventPublisher adapter.
"""
from typing import Optional
from apps.core.infrastructure.events.channels_event_publisher import ChannelsEventPublisher

_default_publisher = ChannelsEventPublisher()


def broadcast_studio_notification(
    message: str,
    level: str = "info",
    action: Optional[str] = None
) -> None:
    """
    Broadcast a studio notification event over Django Channels WebSocket group.
    Delegates to the ChannelsEventPublisher infrastructure adapter.
    """
    _default_publisher.publish_notification(message=message, level=level, action=action)

