"""
AI Copilot API Router.
"""
from typing import Dict, Any, List
from ninja import Router, File
from ninja.files import UploadedFile

from apps.core.ai.api.schemas import ChatHistoryIn, ApproveBreakdownIn
from apps.core.ai.application.use_cases import (
    save_temp_image,
    chat_with_universal_agent,
    list_background_jobs,
    get_pending_breakdown as get_pending_breakdown_uc,
    approve_pending_breakdown,
    list_storage_assets,
)

ai_router = Router(tags=["Universal AI Agent"])


@ai_router.post("/upload-temp-image")
def upload_temp_image(request, file: UploadedFile = File(...)):
    return save_temp_image(file, request)


@ai_router.post("/projects/{project_id}/chat")
def universal_agent_chat(request, project_id: str, payload: ChatHistoryIn):
    return chat_with_universal_agent(project_id, payload)


@ai_router.get("/jobs")
def list_jobs(request):
    return list_background_jobs()


@ai_router.get("/projects/{project_id}/pending-breakdown")
def get_pending_breakdown(request, project_id: str):
    return get_pending_breakdown_uc(project_id)


@ai_router.post("/projects/{project_id}/approve-breakdown")
def approve_breakdown(request, project_id: str, payload: ApproveBreakdownIn):
    return approve_pending_breakdown(project_id, payload)


@ai_router.get("/assets")
def list_assets(request):
    return list_storage_assets()
