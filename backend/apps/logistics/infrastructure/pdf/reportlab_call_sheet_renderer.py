"""
Logistics Infrastructure - ReportLab Call Sheet PDF Renderer Adapter.
Implements ICallSheetPdfRenderer using ReportLab canvas & Platypus flowables.
"""
import io
from typing import Any
from reportlab.pdfgen import canvas
from apps.logistics.application.ports import ICallSheetPdfRenderer


def render_call_sheet_pdf(
    day_number: int,
    calendar_date: Any,
    general_crew_call: Any,
    hospital_address: str = "",
    **kwargs: Any
) -> bytes:
    """
    Render call sheet document into PDF byte stream using ReportLab.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 800, f"CALL SHEET - Day {day_number}")
    c.drawString(100, 780, f"Date: {calendar_date}")
    c.drawString(100, 760, f"General Call Time: {general_crew_call}")
    if hospital_address:
        c.drawString(100, 740, f"Nearest Hospital: {hospital_address}")
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


class ReportLabCallSheetRenderer(ICallSheetPdfRenderer):
    """
    Adapter implementing ICallSheetPdfRenderer using ReportLab.
    Hides ReportLab drawing, styles, canvas, and colors from application use cases.
    """

    def render(
        self,
        day_number: int,
        calendar_date: Any,
        general_crew_call: Any,
        hospital_address: str = "Cedar Sinai Medical Center",
    ) -> bytes:
        return render_call_sheet_pdf(
            day_number=day_number,
            calendar_date=calendar_date,
            general_crew_call=general_crew_call,
            hospital_address=hospital_address,
        )
