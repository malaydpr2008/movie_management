import io
from celery import shared_task
from jinja2 import Template
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

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
    unit = shoot_day.unit
    strips = StripboardItem.objects.filter(shoot_day=shoot_day).order_by('order_index').select_related('scene')
    
    # Get cast working on this day (simplified: characters in the scenes of this shoot day)
    scene_ids = [strip.scene.id for strip in strips if strip.item_type == 'SCENE' and strip.scene]
    # Characters are linked via SceneBreakdownItem in a real complex schema, 
    # but here we'll just grab characters linked to the project for demo if they have no explicit linkage,
    # or just fetch all characters for the project for the proof of concept.
    cast_list = Character.objects.filter(project=unit.project)
    
    template = Template(HTML_TEMPLATE)
    context = {
        'unit_name': unit.name,
        'day_number': shoot_day.day_number,
        'calendar_date': shoot_day.calendar_date.strftime('%A, %B %d, %Y') if shoot_day.calendar_date else '',
        'crew_call': shoot_day.general_crew_call.strftime('%H:%M') if shoot_day.general_crew_call else 'TBD',
        'shooting_call': shoot_day.shooting_call.strftime('%H:%M') if shoot_day.shooting_call else 'TBD',
        'hospital': shoot_day.hospital_address,
        'strips': strips,
        'cast_list': cast_list
    }
    
    html_out = template.render(context)
    
    from weasyprint import HTML
    pdf_file = HTML(string=html_out).write_pdf()
    
    filename = f"call_sheets/call_sheet_day_{shoot_day.day_number}_{shoot_day.id}.pdf"
    
    # Save using default_storage (MinIO)
    saved_path = default_storage.save(filename, ContentFile(pdf_file))
    url = default_storage.url(saved_path)
    
    return url
