import json
import base64
import os
import uuid
from urllib.parse import urlparse
from langchain_core.tools import tool
from django.db import connection
from apps.core.infrastructure.vector.qdrant_vector_adapter import QdrantVectorAdapter
from apps.core.infrastructure.llm.ollama_provider import OllamaLLMProvider

@tool
def list_database_tables() -> str:
    """
    List all relevant database tables in the PostgreSQL database.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (
                    table_name LIKE 'narrative_%' OR 
                    table_name LIKE 'logistics_%' OR 
                    table_name LIKE 'financials_%' OR 
                    table_name LIKE 'shots_%' OR 
                    table_name LIKE 'breakdown_%'
                );
            """)
            rows = cursor.fetchall()
            tables = [row[0] for row in rows]
            return json.dumps(tables)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_database_schema(table_name: str) -> str:
    """
    Get the database schema (columns and data types) for a given table.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = %s;
            """, [table_name])
            rows = cursor.fetchall()
            schema = [{"column_name": row[0], "data_type": row[1]} for row in rows]
            return json.dumps(schema)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def execute_read_only_sql(sql_query: str) -> str:
    """
    Execute a read-only SQL query against the PostgreSQL database.
    """
    forbidden_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'COMMIT']
    upper_query = sql_query.upper()
    
    for kw in forbidden_keywords:
        if kw in upper_query:
            return "Error: Query rejected. Only SELECT statements are allowed."
            
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            rows = cursor.fetchmany(50)
            
            # Get column names
            columns = [col[0] for col in cursor.description]
            
            # Map rows to column names
            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))
                
            # Handle datetime or UUID serialization issues by converting everything to strings first if needed
            # For simplicity, using default json dumps which might fail on complex objects, so we stringify values
            stringified_results = [{k: str(v) for k, v in row.items()} for row in results]
            
            return json.dumps(stringified_results)
    except Exception as e:
        return f"SQL Error: {str(e)}"

@tool
def search_studio_documents(query: str) -> str:
    """
    Search across all uploaded studio documents (PDFs, call sheets, continuity notes) 
    to answer semantic queries using RAG.
    """
    try:
        adapter = QdrantVectorAdapter()
        results = adapter.search(query, limit=4)
        formatted_results = [
            {"content": res.content, "metadata": res.metadata}
            for res in results
        ]
        return json.dumps(formatted_results)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def analyze_production_image(image_url: str, question: str) -> str:
    """
    Analyze a production image (storyboard, costume reference, VFX plate) to answer questions about it.
    """
    from django.conf import settings
    
    try:
        filename = image_url.split('/')[-1]
        file_path = os.path.join(settings.MEDIA_ROOT, 'temp_ai_uploads', filename)
        
        if not os.path.exists(file_path):
            return f"CRITICAL ERROR: Image file not found on disk at {file_path}"
            
        with open(file_path, "rb") as f:
            b64_image = base64.b64encode(f.read()).decode('utf-8')
        
        mime_type = "image/png" if filename.lower().endswith("png") else "image/jpeg"
        
        provider = OllamaLLMProvider()
        return provider.analyze_image(
            image_base64=b64_image,
            prompt=question,
            mime_type=mime_type,
        )
    except Exception as e:
        return f"CRITICAL VISION ERROR: {str(e)}"

@tool
def audit_scene_breakdown(project_id: str, scene_number: str) -> str:
    """
    Cross-check a scene's raw script text against logged database assets to isolate discrepancies
    such as unlogged props, wardrobe, or VFX requirements.
    """
    try:
        from apps.narrative.models import Scene
        from apps.breakdown.models import SceneBreakdownItem
        from apps.shots.models import VfxShot
        
        project_uuid = uuid.UUID(project_id)
        scene = Scene.objects.get(sequence__act__project_id=project_uuid, scene_number=str(scene_number))
        
        script_text = ""
        if scene.script_data and "blocks" in scene.script_data:
            script_text = "\n".join([b.get("content", "") for b in scene.script_data["blocks"]])
            
        breakdown_items = SceneBreakdownItem.objects.filter(scene=scene)
        logged_elements = [f"{item.element_type}: {item.prop.name if item.prop else (item.costume_look.description if item.costume_look else item.custom_notes)}" for item in breakdown_items]
        
        vfx_shots = VfxShot.objects.filter(scene=scene)
        for vfx in vfx_shots:
            logged_elements.append(f"VFX: {vfx.description}")
            
        prompt = f"""
You are an expert Script Auditor. Review the following scene script and the list of currently logged elements (Props, Wardrobe, VFX).
Identify any physical props, wardrobe, or VFX requirements mentioned in the script that are MISSING from the logged elements list.
Return ONLY a valid JSON object with the following keys: missing_props, unlogged_vfx_cues, continuity_warnings. 
The values should be lists of strings.

Scene Synopsis: {scene.synopsis}
Script Text:
{script_text}

Logged Elements:
{chr(10).join(logged_elements)}
"""
        provider = OllamaLLMProvider()
        return provider.generate(prompt=prompt, temperature=0.1)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def dispatch_call_sheet(shoot_day_id: str) -> str:
    """
    Dispatch a background Celery task to generate a Call Sheet PDF for a specific shoot day.
    """
    try:
        from apps.logistics.tasks import generate_call_sheet_pdf
        generate_call_sheet_pdf.delay(shoot_day_id)
        return f"Successfully dispatched Call Sheet generation for Shoot Day {shoot_day_id} to the background workers."
    except ImportError:
        return "Error: generate_call_sheet_pdf task not found."
    except Exception as e:
        return f"Failed to dispatch Call Sheet: {str(e)}"

@tool
def dispatch_dpr_finalizer(shoot_day_id: str) -> str:
    """
    Dispatch a background Celery task to finalize the Daily Production Report (DPR) for a specific shoot day.
    """
    try:
        from apps.logistics.tasks import finalize_dpr
        finalize_dpr.delay(shoot_day_id)
        return f"Successfully dispatched DPR finalization for Shoot Day {shoot_day_id}."
    except ImportError:
        return "Error: finalize_dpr task not found."
    except Exception as e:
        return f"Failed to dispatch DPR finalizer: {str(e)}"

@tool
def dispatch_script_breakdown(project_id: str) -> str:
    """
    Dispatch a background Celery task to break down a script and write scenes/characters to the database.
    """
    try:
        from apps.narrative.tasks import batch_script_breakdown
        
        adapter = QdrantVectorAdapter()
        results = adapter.search("EXT. OR INT.", limit=20)
        raw_script_text = "\n".join([res.content for res in results])
        
        if not raw_script_text:
            return "No script documents found in the vector store to break down."
            
        batch_script_breakdown.delay(project_id, raw_script_text)
        return "Successfully dispatched the script breakdown engine. The studio will be notified when the database is populated."
    except Exception as e:
        return f"Failed to dispatch script breakdown: {str(e)}"
