"""
Core Application Port - LLM Provider.
Hides Ollama SDK, LangChain internals, and vendor clients behind a language & multimodal capability.
"""
from typing import Protocol, TypeVar, Type, Optional, Any
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class ILLMProvider(Protocol):
    """
    Port for Large Language Model generation and multimodal analysis.
    Application use cases rely on this capability without referencing Ollama or LangChain.
    """

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        format_json: bool = False
    ) -> str:
        """
        Generate text response from prompt.
        """
        ...

    def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1
    ) -> T:
        """
        Generate structured output validated against a Pydantic schema.
        """
        ...

    def analyze_image(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str = "image/png"
    ) -> str:
        """
        Analyze an image with a vision-capable multimodal model.
        """
        ...
