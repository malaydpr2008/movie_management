"""
AI Copilot API Schemas.
"""
from typing import Optional, List, Any
from ninja import Schema


class ChatMessageDict(Schema):
    role: str
    content: str
    image_url: Optional[str] = None


class ChatHistoryIn(Schema):
    messages: List[ChatMessageDict]


class ApproveBreakdownIn(Schema):
    scenes: List[Any]
