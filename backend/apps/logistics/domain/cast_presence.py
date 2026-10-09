"""
Logistics Domain - Cast presence and scene flag resolution.
"""
from typing import Dict, List, Tuple, Any, Set, Iterable


def build_character_mapping(characters: Iterable[Any]) -> Dict[str, int]:
    """
    Build dictionary mapping uppercase character names (and common single-word prefixes)
    to their SAG cast ID numbers.
    """
    mapping: Dict[str, int] = {}
    for c in characters:
        name = getattr(c, "name", "")
        cast_id_number = getattr(c, "cast_id_number", 0)
        norm_name = name.strip().upper()
        mapping[norm_name] = cast_id_number
        # Also map first name if multi-word
        parts = norm_name.split()
        if len(parts) > 1 and len(parts[0]) > 2:
            mapping[parts[0]] = cast_id_number
    return mapping


def extract_scene_cast_ids(
    breakdown_items: Iterable[Any],
    script_data: Dict[str, Any] | None,
    char_map: Dict[str, int]
) -> List[int]:
    """
    Extract sorted list of unique cast IDs appearing in a scene based on
    costume tags and script dialogue blocks.
    """
    cast_ids: Set[int] = set()

    # 1. Check costume look assignments
    for item in breakdown_items:
        costume = getattr(item, "costume", None)
        if costume and getattr(costume, "character", None):
            cast_ids.add(costume.character.cast_id_number)

    # 2. Check script dialogue blocks
    data = script_data or {}
    blocks = data.get("blocks", [])
    for b in blocks:
        if b.get("type") == "character":
            raw_name = b.get("content", "").strip().upper()
            if raw_name in char_map:
                cast_ids.add(char_map[raw_name])
            else:
                for c_key, c_num in char_map.items():
                    if raw_name == c_key or raw_name in c_key.split():
                        cast_ids.add(c_num)
                        break

    return sorted(list(cast_ids))


def extract_scene_flags(breakdown_items: Iterable[Any]) -> Tuple[bool, bool]:
    """
    Determine if a scene requires stunts or VFX based on breakdown items and notes.
    Returns (has_stunts, has_vfx).
    """
    has_stunts = False
    has_vfx = False
    stunt_keywords = ("stunt", "wire", "explosion", "fire", "fall", "fight", "crash")

    for item in breakdown_items:
        elem_type = getattr(item, "element_type", "")
        if elem_type == "SFX":
            has_stunts = True
        elif elem_type == "VFX":
            has_vfx = True

        notes = (getattr(item, "custom_notes", "") or "").lower()
        if any(w in notes for w in stunt_keywords):
            has_stunts = True

    return has_stunts, has_vfx
