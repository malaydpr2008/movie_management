"""
Narrative Celery Tasks - Infrastructure / Transport Adapters.
"""
from celery import shared_task
from apps.core.models import BackgroundJob
from apps.core.infrastructure.notifications import broadcast_studio_notification
from apps.narrative.application.use_cases.batch_script_breakdown import BatchScriptBreakdownUseCase


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def batch_script_breakdown(self, project_id: str, document_text: str):
    """
    Celery task adapter for Screenplay Breakdown batch processing.
    Manages job lifecycle and retries; delegates business execution to BatchScriptBreakdownUseCase.
    """
    job = BackgroundJob.objects.create(task_name="batch_script_breakdown", status="RUNNING")
    try:
        use_case = BatchScriptBreakdownUseCase()
        result = use_case.execute(project_id=project_id, document_text=document_text)

        job.status = "SUCCESS"
        job.result = {
            "info": "Task finished successfully",
            "scenes_extracted": result["scenes_extracted"],
        }
        job.save()
    except Exception as e:
        try:
            self.retry(exc=e)
        except self.MaxRetriesExceededError:
            job.status = "FAILED"
            job.error_message = str(e)
            job.save()

            broadcast_studio_notification(
                message=f"Task Failed: {str(e)}",
                level="error",
            )
            raise e
