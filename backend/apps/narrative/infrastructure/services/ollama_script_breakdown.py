"""
Narrative Infrastructure - Ollama Script Breakdown Service.
"""
import json
from typing import Dict, Any


class OllamaScriptBreakdownService:
    """
    Adapter implementing IScriptBreakdownService using LangChain Ollama.
    """

    def __init__(
        self,
        model: str = "qwen3.5:9b",
        base_url: str = "http://host.docker.internal:11434"
    ):
        self.model = model
        self.base_url = base_url

    def extract_scenes(self, document_text: str) -> Dict[str, Any]:
        from langchain_ollama import ChatOllama
        from langchain_core.messages import HumanMessage

        llm = ChatOllama(model=self.model, base_url=self.base_url, format="json")
        prompt = f"""
You are a Script Supervisor. Extract a JSON list of scenes from the provided text.
Format: {{"scenes": [{{"heading": "EXT. ALLEY - NIGHT", "synopsis": "...", "characters": ["KAREN", "VANCE"]}}]}}

Text:
{document_text}
"""
        msg = HumanMessage(content=prompt)
        response = llm.invoke([msg])
        data = json.loads(response.content)
        return data
