import re
import uuid
from typing import Optional
from apps.narrative.models import Project, Act, Sequence, Scene

def parse_fountain_script(project_id: uuid.UUID, script_text: str) -> int:
    project = Project.objects.get(id=project_id)
    
    # Get or create a default Act and Sequence to hold the parsed scenes
    default_act, _ = Act.objects.get_or_create(
        project=project,
        title="Parsed Act 1",
        defaults={'order_index': '10', 'target_page_length': 30.0}
    )
    
    default_sequence, _ = Sequence.objects.get_or_create(
        act=default_act,
        title="Parsed Sequence 1",
        defaults={'order_index': '10.1'}
    )
    
    lines = script_text.split('\n')
    scene_count = 0
    
    # Regex to identify Sluglines: INT., EXT., INT/EXT.
    slugline_regex = re.compile(r'^(INT\.|EXT\.|INT/EXT\.)\s+(.+?)(?:\s*-\s*(.+))?$')
    
    current_scene = None
    current_text_block = []
    
    def save_previous_scene():
        if current_scene:
            # Calculate pages_eighths based on text length (1 page = ~200 words, 8 eighths)
            # words / 200 * 8 = words / 25 eighths
            text = '\n'.join(current_text_block)
            words = len(text.split())
            eighths = max(1, round(words / 25))
            current_scene.pages_eighths = eighths
            current_scene.save()
    
    order_counter = 1
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        match = slugline_regex.match(line)
        if match:
            save_previous_scene()
            
            int_ext = match.group(1).replace('.', '')
            set_name = match.group(2).strip()
            time_of_day = match.group(3).strip() if match.group(3) else 'DAY'
            
            current_scene = Scene.objects.create(
                sequence=default_sequence,
                scene_number=str(order_counter),
                order_index=f"10.1.{order_counter}",
                int_ext=int_ext,
                set_name=set_name,
                time_of_day=time_of_day,
                pages_eighths=1,
                estimated_shoot_minutes=120,
                synopsis=f"Parsed scene from script: {set_name}"
            )
            scene_count += 1
            order_counter += 1
            current_text_block = []
        else:
            if current_scene is not None:
                current_text_block.append(line)
                
    save_previous_scene()
    
    return scene_count
