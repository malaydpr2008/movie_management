"""
Core Infrastructure - Channels Event Publisher Adapter.
Implements IEventPublisher using Django Channels group broadcasting.
"""
from typing import Optional, Dict, Any
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.core.application.ports.event_publisher import IEventPublisher


class ChannelsEventPublisher(IEventPublisher):
    """
    Adapter implementing IEventPublisher.
    Transports real-time studio events over Django Channels and Redis channel layers.
    Hides get_channel_layer, async_to_sync, and channel group semantics from application code.
    """

    def __init__(self, channel_layer=None):
        self._channel_layer = channel_layer

    def _get_layer(self):
        if self._channel_layer is not None:
            return self._channel_layer
        return get_channel_layer()

    def publish_notification(
        self,
        message: str,
        level: str = "info",
        action: Optional[str] = None
    ) -> None:
        layer = self._get_layer()
        if layer is None:
            return

        payload: Dict[str, Any] = {
            "type": "send_notification",
            "message": message,
            "level": level,
        }
        if action:
            payload["action"] = action

        async_to_sync(layer.group_send)("studio_notifications", payload)

    def publish_project_event(
        self,
        project_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> None:
        layer = self._get_layer()
        if layer is None:
            return

        message_data = {
            "type": "studio_message",
            "message": {
                "event": event_type,
                "project_id": project_id,
                "payload": payload,
            }
        }
        async_to_sync(layer.group_send)(f"project_{project_id}", message_data)
