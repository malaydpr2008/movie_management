"""
Core Application Port - Vector Search & Indexing.
Hides Qdrant collections, embedding models, dimensions, and client details behind a vector search capability.
"""
from typing import Protocol, List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass(frozen=True)
class VectorSearchResult:
    """Result item returned from semantic vector similarity search."""
    content: str
    metadata: Dict[str, Any]
    score: Optional[float] = None


class IVectorSearch(Protocol):
    """
    Port for semantic vector search and document indexing.
    Application code depends on this capability without importing Qdrant or embedding libraries.
    """

    def search(
        self,
        query: str,
        limit: int = 4,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """
        Perform semantic similarity search against indexed vector records.
        """
        ...

    def index_document(
        self,
        file_url: str,
        metadata: Dict[str, Any]
    ) -> int:
        """
        Download, parse, chunk, embed, and index a document.
        Returns the number of chunks successfully indexed.
        """
        ...
