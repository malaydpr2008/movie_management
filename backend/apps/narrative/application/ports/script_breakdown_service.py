"""
Narrative Application Port - Script Breakdown Service Interface.
"""
from typing import Protocol, Dict, Any


class IScriptBreakdownService(Protocol):
    """
    Port for extracting scenes and narrative elements from screenplay text via AI.
    """

    def extract_scenes(self, document_text: str) -> Dict[str, Any]:
        """
        Extract structured scene definitions from script text.
        Must return a dict containing {"scenes": [...]}
        """
        ...
