import uuid
from typing import List, Optional, TypedDict
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from django.shortcuts import get_object_or_404
from apps.narrative.models import Scene, Project
from apps.breakdown.models import Prop, Character, CostumeLook, SceneBreakdownItem

class ExtractedProp(BaseModel):
    name: str = Field(..., description="Name of the prop")
    description: Optional[str] = Field(None, description="Description or details about the prop")

class ExtractedWardrobe(BaseModel):
    character_name: str = Field(..., description="Name of the character wearing the wardrobe")
    description: str = Field(..., description="Description of the costume or wardrobe")

class ExtractedVFX(BaseModel):
    description: str = Field(..., description="Description of the visual effects needed")

class ExtractedCharacter(BaseModel):
    name: str = Field(..., description="Name of the character")

class SceneExtraction(BaseModel):
    props: List[ExtractedProp] = Field(default_factory=list, description="Props found in the scene")
    wardrobe: List[ExtractedWardrobe] = Field(default_factory=list, description="Wardrobe/costumes found in the scene")
    vfx: List[ExtractedVFX] = Field(default_factory=list, description="VFX notes found in the scene")
    characters: List[ExtractedCharacter] = Field(default_factory=list, description="Characters appearing in the scene")

class BreakdownState(TypedDict):
    scene_id: str
    project_id: str
    script_text: str
    extracted_data: Optional[SceneExtraction]
    summary: dict

def extract_entities(state: BreakdownState) -> BreakdownState:
    # Use OpenAI API (or compatible local LLM) to extract structured data
    # Note: ensure OPENAI_API_KEY is in environment or use a mock for local dev
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(SceneExtraction)
    
    prompt = f"""
    Analyze the following scene script and extract physical production elements.
    Scene Script:
    {state['script_text']}
    """
    
    try:
        extracted = structured_llm.invoke(prompt)
    except Exception as e:
        # Fallback if API fails (e.g. no key)
        extracted = SceneExtraction(props=[], wardrobe=[], vfx=[], characters=[])
        print("LLM Error:", e)

    state['extracted_data'] = extracted
    return state

def match_existing_catalogs(state: BreakdownState) -> BreakdownState:
    project_id = state['project_id']
    scene = get_object_or_404(Scene, id=state['scene_id'])
    extracted = state['extracted_data']
    
    summary = {
        "props_added": 0,
        "wardrobe_added": 0,
        "vfx_added": 0,
        "characters_added": 0
    }

    if not extracted:
        state['summary'] = summary
        return state

    # Match or Create Props
    for prop_data in extracted.props:
        prop, created = Prop.objects.get_or_create(
            project_id=project_id,
            name=prop_data.name,
            defaults={"description": prop_data.description or ""}
        )
        SceneBreakdownItem.objects.get_or_create(
            scene=scene,
            item_type='PROP',
            item_id=prop.id
        )
        if created:
            summary["props_added"] += 1

    # Match Characters
    char_map = {}
    for char_data in extracted.characters:
        character, created = Character.objects.get_or_create(
            project_id=project_id,
            name=char_data.name
        )
        SceneBreakdownItem.objects.get_or_create(
            scene=scene,
            item_type='CHARACTER',
            item_id=character.id
        )
        char_map[char_data.name] = character
        if created:
            summary["characters_added"] += 1

    # Match Wardrobe
    for ward_data in extracted.wardrobe:
        char = char_map.get(ward_data.character_name)
        if not char:
            char, _ = Character.objects.get_or_create(
                project_id=project_id,
                name=ward_data.character_name
            )
        look, created = CostumeLook.objects.get_or_create(
            character=char,
            description=ward_data.description
        )
        SceneBreakdownItem.objects.get_or_create(
            scene=scene,
            item_type='COSTUME',
            item_id=look.id
        )
        if created:
            summary["wardrobe_added"] += 1

    # Match VFX (We don't have a VFX catalog in breakdown, but we can add as notes or skip if no model)
    # The prompt requested ExtractedVFX but we don't have a specific SceneBreakdownItem for VFX unless item_type='VFX' exists.
    # We will assume item_type='VFX' is valid or we create VfxShot. For now, just summarize it.
    summary["vfx_added"] = len(extracted.vfx)

    state['summary'] = summary
    return state

# Compile Graph
graph_builder = StateGraph(BreakdownState)
graph_builder.add_node("extract_entities", extract_entities)
graph_builder.add_node("match_existing_catalogs", match_existing_catalogs)

graph_builder.set_entry_point("extract_entities")
graph_builder.add_edge("extract_entities", "match_existing_catalogs")
graph_builder.add_edge("match_existing_catalogs", END)
copilot_graph = graph_builder.compile()

def run_scene_breakdown(scene_id: str) -> dict:
    scene = get_object_or_404(Scene, id=scene_id)
    script_text = scene.script_data.get("text", "") if scene.script_data else f"{scene.heading}\\n(No script text available)"
    
    initial_state = {
        "scene_id": str(scene.id),
        "project_id": str(scene.project_id),
        "script_text": script_text,
        "extracted_data": None,
        "summary": {}
    }
    
    final_state = copilot_graph.invoke(initial_state)
    return final_state.get('summary', {})
