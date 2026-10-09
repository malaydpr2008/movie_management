"""
Logistics API Router.
"""
import uuid
from typing import List, Dict, Any
from ninja import Router

from apps.logistics.api.schemas import (
    ScheduleOut,
    ShootDayDetailOut,
    ShootDayCreateIn,
    StripboardItemDetailOut,
    StripReorderIn,
    StripScheduleSceneIn,
    StripBannerIn,
    DoodMatrixOut,
    ShootDayOut,
    DPROut,
    DPRIn,
    CrewMemberOut,
    CrewMemberIn,
)
from apps.logistics.application.use_cases import (
    queue_call_sheet_generation,
    get_project_schedule as get_project_schedule_uc,
    create_shoot_day as create_shoot_day_uc,
    reorder_strip as reorder_strip_uc,
    schedule_scene_strip as schedule_scene_strip_uc,
    add_banner_strip as add_banner_strip_uc,
    delete_strip as delete_strip_uc,
    get_project_dood_matrix as get_project_dood_matrix_uc,
    get_project_stripboard as get_project_stripboard_uc,
    get_dpr as get_dpr_uc,
    update_dpr as update_dpr_uc,
    list_crew as list_crew_uc,
    create_crew_member as create_crew_member_uc,
    update_crew_member as update_crew_member_uc,
    delete_crew_member as delete_crew_member_uc,
)

logistics_router = Router(tags=["Logistics & Stripboard"])


@logistics_router.post("/shoot-days/{shoot_day_id}/generate-call-sheet", response=Dict[str, Any])
def generate_call_sheet(request, shoot_day_id: uuid.UUID):
    return queue_call_sheet_generation(shoot_day_id)


@logistics_router.get("/projects/{project_id}/schedule", response=ScheduleOut)
def get_project_schedule(request, project_id: uuid.UUID):
    return get_project_schedule_uc(project_id)


@logistics_router.post("/shoot-days", response=ShootDayDetailOut)
def create_shoot_day(request, payload: ShootDayCreateIn):
    return create_shoot_day_uc(payload)


@logistics_router.post("/strips/reorder", response=StripboardItemDetailOut)
def reorder_strip(request, payload: StripReorderIn):
    return reorder_strip_uc(payload)


@logistics_router.post("/strips/schedule-scene", response=StripboardItemDetailOut)
def schedule_scene_strip(request, payload: StripScheduleSceneIn):
    return schedule_scene_strip_uc(payload)


@logistics_router.post("/strips/banner", response=StripboardItemDetailOut)
def add_banner_strip(request, payload: StripBannerIn):
    return add_banner_strip_uc(payload)


@logistics_router.delete("/strips/{strip_id}")
def delete_strip(request, strip_id: uuid.UUID):
    return delete_strip_uc(strip_id)


@logistics_router.get("/projects/{project_id}/dood", response=DoodMatrixOut)
def get_project_dood_matrix(request, project_id: uuid.UUID):
    return get_project_dood_matrix_uc(project_id)


@logistics_router.get("/projects/{project_id}/stripboard", response=List[ShootDayOut])
def get_project_stripboard(request, project_id: uuid.UUID):
    return get_project_stripboard_uc(project_id)


@logistics_router.get("/shoot-days/{shoot_day_id}/dpr", response=DPROut)
def get_dpr(request, shoot_day_id: uuid.UUID):
    return get_dpr_uc(shoot_day_id)


@logistics_router.post("/shoot-days/{shoot_day_id}/dpr", response=DPROut)
def update_dpr(request, shoot_day_id: uuid.UUID, payload: DPRIn):
    return update_dpr_uc(shoot_day_id, payload)


@logistics_router.get("/projects/{project_id}/crew", response=List[CrewMemberOut])
def list_crew(request, project_id: uuid.UUID):
    return list_crew_uc(project_id)


@logistics_router.post("/projects/{project_id}/crew", response=CrewMemberOut)
def create_crew_member(request, project_id: uuid.UUID, payload: CrewMemberIn):
    return create_crew_member_uc(project_id, payload)


@logistics_router.patch("/crew/{crew_id}", response=CrewMemberOut)
def update_crew_member(request, crew_id: uuid.UUID, payload: CrewMemberIn):
    return update_crew_member_uc(crew_id, payload)


@logistics_router.delete("/crew/{crew_id}")
def delete_crew_member(request, crew_id: uuid.UUID):
    return delete_crew_member_uc(crew_id)
