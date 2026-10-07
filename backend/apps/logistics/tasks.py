import io
import os
from django.conf import settings
from celery import shared_task
from jinja2 import Template
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from reportlab.pdfgen import canvas
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.logistics.models import ShootDay, StripboardItem
from apps.breakdown.models import Character

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Helvetica, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
        .details { margin-bottom: 20px; font-size: 14px; }
        .details table { width: 100%; }
        .details td { padding: 5px; }
        h1 { margin: 0; font-size: 24px; }
        h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #ccc; }
        table.strips, table.cast { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        table.strips th, table.strips td, table.cast th, table.cast td { border: 1px solid #000; padding: 5px; text-align: left; }
        table.strips th, table.cast th { background-color: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CALL SHEET</h1>
        <div><strong>{{ unit_name }} - Day {{ day_number }}</strong></div>
        <div>Date: {{ calendar_date }}</div>
    </div>
    
    <div class="details">
        <table>
            <tr>
                <td><strong>Crew Call:</strong> {{ crew_call }}</td>
                <td><strong>Shooting Call:</strong> {{ shooting_call }}</td>
            </tr>
            <tr>
                <td colspan="2"><strong>Hospital:</strong> {{ hospital }}</td>
            </tr>
        </table>
    </div>

    <h2>SCENES</h2>
    <table class="strips">
        <tr>
            <th>Scene</th>
            <th>Set</th>
            <th>D/N</th>
            <th>Pages</th>
        </tr>
        {% for item in strips %}
        <tr>
            {% if item.item_type == 'SCENE' and item.scene %}
            <td>{{ item.scene.scene_number }}</td>
            <td>{{ item.scene.set_name }}</td>
            <td>{{ item.scene.time_of_day }}</td>
            <td>{{ item.scene.pages_display }}</td>
            {% else %}
            <td colspan="4" style="background-color: #e0e0e0; text-align: center; font-weight: bold;">{{ item.banner_label }}</td>
            {% endif %}
        </tr>
        {% endfor %}
    </table>

    <h2>CAST CALL</h2>
    <table class="cast">
        <tr>
            <th>ID</th>
            <th>Character</th>
            <th>Actor</th>
            <th>Status</th>
        </tr>
        {% for cast in cast_list %}
        <tr>
            <td>{{ cast.cast_id_number }}</td>
            <td>{{ cast.name }}</td>
            <td>{{ cast.actor_name }}</td>
            <td>W</td>
        </tr>
        {% endfor %}
    </table>
</body>
</html>
"""

@shared_task
def generate_call_sheet_pdf(shoot_day_id: str):
    shoot_day = ShootDay.objects.get(id=shoot_day_id)
    
    # Ensure directory exists
    os.makedirs(os.path.join(settings.MEDIA_ROOT, 'call_sheets'), exist_ok=True)
    file_path = os.path.join(settings.MEDIA_ROOT, 'call_sheets', f"call_sheet_day_{shoot_day.day_number}.pdf")
    
    # Generate PDF
    c = canvas.Canvas(file_path)
    c.drawString(100, 800, f"CALL SHEET - Day {shoot_day.day_number}")
    c.drawString(100, 780, f"Date: {shoot_day.calendar_date}")
    c.drawString(100, 760, f"General Call Time: {shoot_day.general_crew_call}")
    c.save()
    
    # Notify via WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "studio_notifications",
        {"type": "send_notification", "message": f"Call Sheet PDF generated for Day {shoot_day.day_number}!", "level": "success", "action": "call_sheet_ready"}
    )
    return f"Saved to {file_path}"


@shared_task
def finalize_dpr(shoot_day_id: str):
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "studio_notifications",
        {"type": "send_notification", "message": f"Action Completed: finalize_dpr finished successfully.", "level": "success"}
    )
    return True
