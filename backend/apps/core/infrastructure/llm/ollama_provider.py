"""
Core Infrastructure - Ollama LLM Provider Adapter.
Implements ILLMProvider using ChatOllama and LangChain, completely encapsulating
Ollama client calls, system prompts, structured schemas, and vision models.
"""
import os
from typing import TypeVar, Type, Optional
from pydantic import BaseModel
from apps.core.application.ports.llm_provider import ILLMProvider

T = TypeVar("T", bound=BaseModel)


class OllamaLLMProvider(ILLMProvider):
    """
    Adapter implementing ILLMProvider using Ollama models.
    Hides langchain_ollama, model names, and base URLs from application/domain layers.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_model: str = "qwen3.5:9b",
        vision_model: str = "hf.co/mradermacher/Qwen3-VL-8B-Instruct-GGUF:Q4_K_M",
    ):
        self.base_url = base_url or os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        self.default_model = default_model
        self.vision_model = vision_model

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        format_json: bool = False,
    ) -> str:
        from langchain_ollama import ChatOllama
        from langchain_core.messages import HumanMessage, SystemMessage

        kwargs = {
            "model": self.default_model,
            "base_url": self.base_url,
            "temperature": temperature,
        }
        if format_json:
            kwargs["format"] = "json"

        llm = ChatOllama(**kwargs)
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        response = llm.invoke(messages)
        return str(response.content)

    def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        from langchain_ollama import ChatOllama
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatOllama(
            model=self.default_model,
            base_url=self.base_url,
            temperature=temperature,
        )
        structured_llm = llm.with_structured_output(schema)

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        return structured_llm.invoke(messages)

    def analyze_image(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str = "image/png",
    ) -> str:
        from langchain_ollama import ChatOllama
        from langchain_core.messages import HumanMessage

        vision_llm = ChatOllama(
            model=self.vision_model,
            base_url=self.base_url,
            temperature=0.1,
        )
        msg = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": f"data:{mime_type};base64,{image_base64}"},
        ])
        response = vision_llm.invoke([msg])
        return str(response.content)
