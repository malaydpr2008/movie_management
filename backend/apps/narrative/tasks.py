import json
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.narrative.models import Scene, Project
from apps.breakdown.models import Character
from django.core.cache import cache

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def batch_script_breakdown(self, project_id: str, document_text: str):
    from apps.core.models import BackgroundJob
    job = BackgroundJob.objects.create(task_name="batch_script_breakdown", status="RUNNING")
    try:
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
        
        data = json.loads(response.content)
        scenes = data.get('scenes', [])
        cache.set(f"pending_breakdown_{project_id}", data, timeout=86400)
                
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "studio_notifications",
            {"type": "send_notification", "message": "Script Breakdown ready for human review!", "level": "info", "action": "review_breakdown"}
        )
        
        job.status = "SUCCESS"
        job.result = {"info": "Task finished successfully", "scenes_extracted": len(scenes)}
        job.save()
    except Exception as e:
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            job.status = "FAILED"
            job.error_message = str(e)
            job.save()
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "studio_notifications",
                {"type": "send_notification", "message": f"Task Failed: {str(e)}", "level": "error"}
            )
            raise e
