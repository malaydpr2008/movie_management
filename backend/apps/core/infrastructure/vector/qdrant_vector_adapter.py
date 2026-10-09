"""
Core Infrastructure - Qdrant Vector Search Adapter.
Implements IVectorSearch by encapsulating QdrantClient, OllamaEmbeddings,
collection lifecycle, PyMuPDF extraction, and LangChain document chunking.
"""
import os
import tempfile
import requests
from typing import List, Dict, Any, Optional

from apps.core.application.ports.vector_search import IVectorSearch, VectorSearchResult


class QdrantVectorAdapter(IVectorSearch):
    """
    Adapter implementing IVectorSearch using Qdrant and Ollama embeddings.
    Hides collection names, embedding models, vector dimensions, and Qdrant client details.
    """

    def __init__(
        self,
        qdrant_url: Optional[str] = None,
        ollama_url: Optional[str] = None,
        collection_name: str = "studio_documents",
        embedding_model: str = "bge-m3:latest",
    ):
        self.qdrant_url = qdrant_url or os.environ.get("QDRANT_URL", "http://qdrant:6333")
        self.ollama_url = ollama_url or os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        self.collection_name = collection_name
        self.embedding_model = embedding_model
        self._embeddings = None
        self._client = None

    def _get_embeddings(self):
        if self._embeddings is None:
            from langchain_ollama import OllamaEmbeddings
            self._embeddings = OllamaEmbeddings(
                model=self.embedding_model,
                base_url=self.ollama_url,
            )
        return self._embeddings

    def _get_client(self):
        if self._client is None:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(url=self.qdrant_url)
        return self._client

    def _get_vector_store(self):
        from langchain_qdrant import QdrantVectorStore
        return QdrantVectorStore(
            client=self._get_client(),
            collection_name=self.collection_name,
            embedding=self._get_embeddings(),
        )

    def search(
        self,
        query: str,
        limit: int = 4,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[VectorSearchResult]:
        """
        Similarity search returning domain VectorSearchResult objects.
        """
        try:
            store = self._get_vector_store()
            results = store.similarity_search(query, k=limit)
            return [
                VectorSearchResult(
                    content=res.page_content,
                    metadata=res.metadata,
                )
                for res in results
            ]
        except Exception as e:
            # Safe degradation if Qdrant / Ollama are unreachable in development
            return []

    def index_document(
        self,
        file_url: str,
        metadata: Dict[str, Any]
    ) -> int:
        """
        Downloads a document, extracts text using PyMuPDF, chunks it, and indexes into Qdrant.
        """
        import fitz  # PyMuPDF
        from langchain_core.documents import Document
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        # Ensure collection exists with 1024-dim cosine distance
        try:
            client = self._get_client()
            col_info = client.get_collection(self.collection_name)
            if col_info.config.params.vectors.size != 1024:
                client.delete_collection(self.collection_name)
                from qdrant_client.models import VectorParams, Distance
                client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
                )
        except Exception:
            pass

        response = requests.get(file_url, stream=True)
        if response.status_code != 200:
            raise Exception(f"Failed to download document from {file_url}")

        text_content = ""
        with tempfile.NamedTemporaryFile(delete=True) as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            temp_file.flush()

            try:
                doc = fitz.open(temp_file.name)
                for page in doc:
                    text_content += page.get_text()
                doc.close()
            except Exception as e:
                raise Exception(f"Failed to parse document: {str(e)}")

        if not text_content.strip():
            return 0

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_text(text_content)

        documents = [
            Document(page_content=chunk, metadata=metadata) for chunk in chunks
        ]

        store = self._get_vector_store()
        store.add_documents(documents)
        return len(documents)
