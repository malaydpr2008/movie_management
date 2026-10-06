import json
import uuid
from langchain_core.tools import tool
from apps.logistics.models import ShootDay, StripboardItem
from apps.narrative.models import Project

@tool
def get_project_schedule(project_id: str) -> str:
    """
    Retrieve the entire shooting schedule for a given project.
    Returns a JSON string summarizing the shoot days and the scenes scheduled on each day.
    """
    try:
        project_uuid = uuid.UUID(project_id)
        shoot_days = ShootDay.objects.filter(project_id=project_uuid).prefetch_related('stripboard_items__scene').order_by('day_number')
        
        schedule = []
        for day in shoot_days:
            strips = []
            for strip in day.stripboard_items.all():
                if strip.scene:
                    strips.append({
                        "strip_id": str(strip.id),
                        "scene_number": strip.scene.scene_number,
                        "heading": strip.scene.heading,
                        "estimated_time": strip.scene.estimated_time
                    })
            schedule.append({
                "shoot_day_id": str(day.id),
                "day_number": day.day_number,
                "call_time": str(day.call_time) if day.call_time else None,
                "scenes": strips
            })
            
        return json.dumps(schedule)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def reschedule_scene(strip_id: str, target_shoot_day_id: str) -> str:
    """
    Move a scene (represented by a StripboardItem) to a different ShootDay.
    """
    try:
        strip_uuid = uuid.UUID(strip_id)
        target_day_uuid = uuid.UUID(target_shoot_day_id)
        
        strip = StripboardItem.objects.get(id=strip_uuid)
        target_day = ShootDay.objects.get(id=target_day_uuid)
        
        strip.shoot_day = target_day
        strip.save()
        
        return json.dumps({"success": True, "message": f"Strip {strip_id} moved to ShootDay {target_day.day_number}"})
    except StripboardItem.DoesNotExist:
        return json.dumps({"error": "StripboardItem not found."})
    except ShootDay.DoesNotExist:
        return json.dumps({"error": "Target ShootDay not found."})
    except Exception as e:
        return json.dumps({"error": str(e)})
