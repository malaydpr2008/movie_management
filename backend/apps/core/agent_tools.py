import json
import uuid
from langchain_core.tools import tool
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langchain_ollama import OllamaEmbeddings

@tool
def get_project_schedule(project_id: str) -> str:
    """
    Retrieve the entire shooting schedule for a given project.
    Returns a JSON string summarizing the shoot days and the scenes scheduled on each day.
    """
    try:
        from apps.logistics.models import ShootDay
        from apps.narrative.models import Project
        project_uuid = uuid.UUID(project_id)
        # Note: project_id might be needed to relate ShootDay. ShootDay usually relates to ProductionUnit which relates to Project.
        # Ensure project filter works.
        shoot_days = ShootDay.objects.filter(unit__project_id=project_uuid).prefetch_related('stripboard_items__scene').order_by('day_number')
        
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
        from apps.logistics.models import ShootDay, StripboardItem
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

@tool
def search_studio_documents(query: str) -> str:
    """
    Search across all uploaded studio documents (PDFs, call sheets, continuity notes) 
    to answer semantic queries using RAG.
    """
    try:
        embeddings = OllamaEmbeddings(
            model="bge-m3:latest",
            base_url="http://host.docker.internal:11434"
        )
        qdrant_client = QdrantClient(url="http://qdrant:6333")
        store = QdrantVectorStore(
            client=qdrant_client,
            collection_name="studio_documents",
            embedding=embeddings,
        )
        
        results = store.similarity_search(query, k=4)
        
        formatted_results = []
        for res in results:
            formatted_results.append({
                "content": res.page_content,
                "metadata": res.metadata
            })
            
        return json.dumps(formatted_results)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_financial_summary(project_id: str) -> str:
    """
    Retrieve the financial summary for a given project, including total estimated budget,
    actual costs, and variance.
    """
    try:
        from apps.financials.models import BudgetAccount, LineItem
        from django.db.models import Sum
        project_uuid = uuid.UUID(project_id)
        accounts = BudgetAccount.objects.filter(project_id=project_uuid)
        
        # Calculate totals
        line_items = LineItem.objects.filter(account__in=accounts)
        
        estimated_total = sum(item.estimated_rate * item.estimated_quantity * item.estimated_days for item in line_items)
        actual_total = sum((item.actual_rate or 0) * (item.actual_quantity or 0) * (item.actual_days or 0) for item in line_items)
        
        variance = estimated_total - actual_total
        
        summary = {
            "estimated_total": float(estimated_total),
            "actual_total": float(actual_total),
            "variance": float(variance)
        }
        
        return json.dumps(summary)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_crew_roster(project_id: str) -> str:
    """
    Retrieve all crew members for a given project, mapping Departments to a list of Crew names and Roles.
    """
    try:
        from apps.logistics.models import CrewMember
        project_uuid = uuid.UUID(project_id)
        crew_members = CrewMember.objects.filter(project_id=project_uuid)
        
        roster = {}
        for member in crew_members:
            dept = member.department
            if dept not in roster:
                roster[dept] = []
            roster[dept].append({
                "name": member.name,
                "role": member.role,
                "phone": member.phone,
                "email": member.email
            })
            
        return json.dumps(roster)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_project_scenes(project_id: str) -> str:
    """
    Retrieve all scenes for a given project, returning a JSON summary of Scene Headings 
    and their current LexoRank order.
    """
    try:
        from apps.narrative.models import Scene
        project_uuid = uuid.UUID(project_id)
        scenes = Scene.objects.filter(sequence__act__project_id=project_uuid).order_by('lexorank')
        
        summary = []
        for scene in scenes:
            summary.append({
                "scene_id": str(scene.id),
                "scene_number": scene.scene_number,
                "heading": scene.heading,
                "lexorank": scene.lexorank
            })
            
        return json.dumps(summary)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_vfx_tracker(project_id: str) -> str:
    """
    Retrieve all VFX shots for a given project, returning a JSON summary grouped by pipeline status.
    """
    try:
        from apps.shots.models import VfxShot
        project_uuid = uuid.UUID(project_id)
        # Assuming VfxShot is related to Scene which is related to Sequence -> Act -> Project
        shots = VfxShot.objects.filter(scene__sequence__act__project_id=project_uuid)
        
        tracker = {}
        for shot in shots:
            status = shot.status
            if status not in tracker:
                tracker[status] = []
            tracker[status].append({
                "shot_id": str(shot.id),
                "vfx_id": shot.vfx_id,
                "description": shot.description,
                "cost_estimate": float(shot.cost_estimate) if shot.cost_estimate else 0.0
            })
            
        return json.dumps(tracker)
    except Exception as e:
        return json.dumps({"error": str(e)})
