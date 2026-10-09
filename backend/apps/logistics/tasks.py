"""
Logistics Celery Tasks - Infrastructure / Transport Adapters.
"""
from celery import shared_task
from apps.core.models import BackgroundJob
from apps.core.infrastructure.notifications import broadcast_studio_notification
from apps.logistics.application.call_sheet_use_case import GenerateCallSheetPdfUseCase
from apps.logistics.application.finalize_dpr_use_case import FinalizeDprUseCase


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_call_sheet_pdf(self, shoot_day_id: str):
    """
    Celery task adapter for Call Sheet PDF generation.
    Manages job lifecycle and retries; delegates business execution to GenerateCallSheetPdfUseCase.
    """
    job = BackgroundJob.objects.create(task_name="generate_call_sheet_pdf", status="RUNNING")
    try:
        use_case = GenerateCallSheetPdfUseCase()
        result = use_case.execute(shoot_day_id=shoot_day_id)

        job.status = "SUCCESS"
        job.result = {
            "info": "Task finished successfully",
            "file": result["saved_path"],
            "url": result["file_url"],
        }
        job.save()
        return f"Saved to {result['file_url']}"
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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def finalize_dpr(self, shoot_day_id: str):
    """
    Celery task adapter for DPR finalization.
    Manages job lifecycle and retries; delegates business execution to FinalizeDprUseCase.
    """
    job = BackgroundJob.objects.create(task_name="finalize_dpr", status="RUNNING")
    try:
        use_case = FinalizeDprUseCase()
        result = use_case.execute(shoot_day_id=shoot_day_id)

        job.status = "SUCCESS"
        job.result = result
        job.save()
        return True
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
