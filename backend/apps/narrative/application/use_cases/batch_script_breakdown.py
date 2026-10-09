"""
Narrative Application - Batch Script Breakdown Use Case.
"""
from typing import Dict, Any, Optional
from apps.narrative.application.ports.script_breakdown_service import IScriptBreakdownService
from apps.narrative.infrastructure.services.ollama_script_breakdown import OllamaScriptBreakdownService
from apps.core.application.ports.cache import ICacheService
from apps.core.infrastructure.cache.django_cache_adapter import DjangoCacheAdapter
from apps.core.application.ports.event_publisher import IEventPublisher
from apps.core.infrastructure.events.channels_event_publisher import ChannelsEventPublisher
from apps.core.infrastructure.notifications import broadcast_studio_notification


class BatchScriptBreakdownUseCase:
    """
    Orchestrates screenplay parsing via AI breakdown service,
    caching the result for human approval, and publishing studio event notifications.
    Depends on IScriptBreakdownService, ICacheService, and IEventPublisher ports.
    """

    def __init__(
        self,
        breakdown_service: Optional[IScriptBreakdownService] = None,
        cache_client: Optional[ICacheService] = None,
        event_publisher: Optional[IEventPublisher] = None,
        notification_service=None,
    ):
        self.breakdown_service = breakdown_service or OllamaScriptBreakdownService()

        if cache_client is not None and not hasattr(cache_client, "exists"):
            self.cache = DjangoCacheAdapter(cache_client)
        else:
            self.cache = cache_client or DjangoCacheAdapter()

        if event_publisher is not None:
            self.event_publisher = event_publisher
        elif notification_service is not None:
            class _LegacyAdapter:
                def publish_notification(self, message, level="info", action=None):
                    notification_service(message=message, level=level, action=action)
            self.event_publisher = _LegacyAdapter()
        else:
            self.event_publisher = ChannelsEventPublisher()

        self.broadcast_notification = self.event_publisher.publish_notification

    def execute(self, project_id: str, document_text: str) -> Dict[str, Any]:
        # 1. AI scene extraction via port
        data = self.breakdown_service.extract_scenes(document_text)
        scenes = data.get("scenes", [])

        # 2. Cache pending breakdown via ICacheService port (24 hour TTL)
        self.cache.set(f"pending_breakdown_{project_id}", data, timeout=86400)

        # 3. Publish team notification via IEventPublisher port
        self.event_publisher.publish_notification(
            message="Script Breakdown ready for human review!",
            level="info",
            action="review_breakdown",
        )

        return {
            "scenes_extracted": len(scenes),
            "data": data,
        }

