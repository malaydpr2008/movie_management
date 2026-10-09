from typing import List, Optional, TypedDict

from django.db import transaction
from django.shortcuts import get_object_or_404
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from apps.breakdown.models import (
    CategoryChoices,
    Character,
    CostumeLook,
    Prop,
    SceneBreakdownItem,
)
from apps.core.infrastructure.llm.ollama_provider import OllamaLLMProvider
from apps.narrative.models import Scene


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


def _get_scene_project_id(scene: Scene) -> Optional[str]:
    if scene.sequence and scene.sequence.act and scene.sequence.act.project_id:
        return str(scene.sequence.act.project_id)
    if hasattr(scene, "project_id") and scene.project_id:
        return str(scene.project_id)
    if scene.master_location and scene.master_location.project_id:
        return str(scene.master_location.project_id)
    return None


def extract_entities(state: BreakdownState) -> BreakdownState:
    prompt = f"""
Analyze the following scene script and extract physical production elements.
Scene Script:
{state['script_text']}
"""
    try:
        extracted = OllamaLLMProvider().generate_structured(
            prompt, SceneExtraction, temperature=0.1
        )
        state["extracted_data"] = (
            extracted if isinstance(extracted, SceneExtraction) else SceneExtraction()
        )
    except Exception:
        # Keep the workflow usable when the optional LLM service is unavailable.
        # The caller receives a zero-count summary; tests cover this fallback.
        state["extracted_data"] = SceneExtraction()
    return state


def match_existing_catalogs(state: BreakdownState) -> BreakdownState:
    scene = get_object_or_404(Scene, id=state["scene_id"])
    project_id = state.get("project_id") or _get_scene_project_id(scene)
    if not project_id:
        raise ValueError(f"Cannot run breakdown: Scene {scene.id} is not associated with any project.")

    extracted = state.get("extracted_data")
    summary = {
        "props_added": 0,
        "wardrobe_added": 0,
        "vfx_added": 0,
        "characters_added": 0,
    }
    if not extracted:
        state["summary"] = summary
        return state

    # Keep catalog creation and scene tagging consistent if a database write fails.
    with transaction.atomic():
        for prop_data in extracted.props:
            prop_name = (prop_data.name or "").strip()
            if not prop_name:
                continue
            prop, created = Prop.objects.get_or_create(
                project_id=project_id,
                name=prop_name,
            )
            SceneBreakdownItem.objects.get_or_create(
                scene=scene,
                element_type=CategoryChoices.PROPS,
                prop=prop,
                defaults={"custom_notes": prop_data.description or ""},
            )
            if created:
                summary["props_added"] += 1

        char_map = {}
        for char_data in extracted.characters:
            char_name = (char_data.name or "").strip()
            if not char_name:
                continue
            character, created = Character.objects.get_or_create(
                project_id=project_id,
                name=char_name,
            )
            # The model has no Character FK on SceneBreakdownItem. Represent the
            # scene's cast tag using the supported CAST category and its notes.
            SceneBreakdownItem.objects.get_or_create(
                scene=scene,
                element_type=CategoryChoices.CAST,
                custom_notes=character.name,
            )
            char_map[char_name] = character
            if created:
                summary["characters_added"] += 1

        for wardrobe_data in extracted.wardrobe:
            wardrobe_char = (wardrobe_data.character_name or "").strip()
            wardrobe_desc = (wardrobe_data.description or "").strip()
            if not wardrobe_char or not wardrobe_desc:
                continue
            character = char_map.get(wardrobe_char)
            if character is None:
                character, created_character = Character.objects.get_or_create(
                    project_id=project_id,
                    name=wardrobe_char,
                )
                char_map[wardrobe_char] = character
                if created_character:
                    summary["characters_added"] += 1

            look, created = CostumeLook.objects.get_or_create(
                character=character,
                description=wardrobe_desc,
            )
            SceneBreakdownItem.objects.get_or_create(
                scene=scene,
                element_type=CategoryChoices.WARDROBE,
                costume=look,
                defaults={"custom_notes": wardrobe_desc},
            )
            if created:
                summary["wardrobe_added"] += 1

        # There is currently no dedicated VFX catalog or relation in this model.
        # Count extracted notes, but don't claim persisted VFX records were added.
        summary["vfx_added"] = len(extracted.vfx)

    state["summary"] = summary
    return state


# Compile graph
_graph_builder = StateGraph(BreakdownState)
_graph_builder.add_node("extract_entities", extract_entities)
_graph_builder.add_node("match_existing_catalogs", match_existing_catalogs)
_graph_builder.set_entry_point("extract_entities")
_graph_builder.add_edge("extract_entities", "match_existing_catalogs")
_graph_builder.add_edge("match_existing_catalogs", END)
copilot_graph = _graph_builder.compile()


def _extract_script_text(scene: Scene) -> str:
    script_data = scene.script_data or {}
    blocks = script_data.get("blocks")
    usable_parts: List[str] = []

    if isinstance(blocks, list):
        for b in blocks:
            if isinstance(b, dict):
                content = b.get("content")
                if isinstance(content, str) and content.strip():
                    usable_parts.append(content)

    if usable_parts:
        return "\n".join(usable_parts)

    raw_text = script_data.get("text")
    if isinstance(raw_text, str) and raw_text.strip():
        return raw_text

    heading = f"{scene.int_ext} {scene.set_name} - {scene.time_of_day}" if scene.set_name else "SCENE"
    return f"{heading}\n(No script text available)"


def run_scene_breakdown(scene_id: str) -> dict:
    scene = get_object_or_404(Scene, id=scene_id)
    project_id = _get_scene_project_id(scene)
    if not project_id:
        raise ValueError(f"Cannot run breakdown: Scene {scene_id} is not associated with any project.")

    script_text = _extract_script_text(scene)
    initial_state: BreakdownState = {
        "scene_id": str(scene.id),
        "project_id": project_id,
        "script_text": script_text,
        "extracted_data": None,
        "summary": {},
    }
    final_state = copilot_graph.invoke(initial_state)
    return final_state.get("summary", {})
