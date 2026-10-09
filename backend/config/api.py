"""
Unified CineFlow Studio Ninja API.
Orchestrates bounded-context domain routers.
"""
from ninja import NinjaAPI

from apps.core.studio.api.router import studio_router
from apps.narrative.api.router import narrative_router
from apps.shots.api.router import shots_router, vfx_router
from apps.breakdown.api.router import breakdown_router
from apps.core.media.api.router import media_router
from apps.logistics.api.router import logistics_router
from apps.financials.api.router import financials_router
from apps.core.ai.api.router import ai_router

api = NinjaAPI(
    title="Movie Management Studio API",
    version="1.0.0",
    description="Dual-Tree Film Production and Screenplay Breakdown API Engine"
)

# Register bounded-context routers on unified api instance
api.add_router("/studio", studio_router)
api.add_router("/narrative", narrative_router)
api.add_router("/shots", shots_router)
api.add_router("/breakdown", breakdown_router)
api.add_router("/media", media_router)
api.add_router("/logistics", logistics_router)
api.add_router("/vfx", vfx_router)
api.add_router("/financials", financials_router)
api.add_router("/ai", ai_router)
