import json
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.narrative.models import Scene, Project
from apps.breakdown.models import Character

@shared_task
def batch_script_breakdown(project_id: str, document_text: str):
    from langchain_ollama import ChatOllama
    from langchain_core.messages import HumanMessage
    
    llm = ChatOllama(model="qwen3.5:9b", base_url="http://host.docker.internal:11434", format="json")
    prompt = f"""
You are a Script Supervisor. Extract a JSON list of scenes from the provided text.
Format: {{"scenes": [{{"heading": "EXT. ALLEY - NIGHT", "synopsis": "...", "characters": ["KAREN", "VANCE"]}}]}}

Text:
{document_text}
"""
    msg = HumanMessage(content=prompt)
    response = llm.invoke([msg])
    
    try:
        data = json.loads(response.content)
        scenes = data.get('scenes', [])
        project = Project.objects.get(id=project_id)
        
        for idx, scene_data in enumerate(scenes):
            heading = scene_data.get('heading', '')
            synopsis = scene_data.get('synopsis', '')
            chars = scene_data.get('characters', [])
            
            # Simple parsing of heading for set, int/ext, time
            int_ext = 'EXT' if 'EXT' in heading.upper() else 'INT'
            time_of_day = 'NIGHT' if 'NIGHT' in heading.upper() else 'DAY'
            set_name = heading.replace('INT.', '').replace('EXT.', '').replace('- NIGHT', '').replace('- DAY', '').strip()
            
            # For demonstration, creating a scene without sequence assignment
            scene = Scene.objects.create(
                scene_number=str(idx+1),
                order_index=str(idx+1),
                int_ext=int_ext,
                set_name=set_name,
                time_of_day=time_of_day,
                pages_eighths=8,
                pages_display="1",
                estimated_shoot_minutes=60,
                synopsis=synopsis
            )
            
            for char_name in chars:
                Character.objects.get_or_create(
                    project=project,
                    name=char_name,
                    defaults={'cast_id_number': 0, 'actor_name': ''}
                )
                
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "studio_notifications",
            {"type": "send_notification", "message": f"Script Breakdown Complete! Extracted {len(scenes)} scenes.", "level": "success"}
        )
    except Exception as e:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "studio_notifications",
            {"type": "send_notification", "message": f"Script Breakdown Failed: {str(e)}", "level": "error"}
        )
