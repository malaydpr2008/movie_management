import tempfile
import requests
import fitz  # PyMuPDF
from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Initialize local Ollama embeddings model
embeddings = OllamaEmbeddings(
    model="bge-m3:latest",
    base_url="http://host.docker.internal:11434"
)

# We will initialize the Qdrant client lazily in the ingest function
collection_name = "studio_documents"

def get_vector_store():
    qdrant_client = QdrantClient(url="http://qdrant:6333")
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=collection_name,
        embedding=embeddings,
    )

def ingest_document(file_url: str, metadata: dict):
    """
    Downloads a document from MinIO (or any URL), extracts text, chunks it, and ingests into Qdrant.
    """
    # Ensure Qdrant collection is configured for 1024-dim vectors
    try:
        qdrant_client = QdrantClient(url="http://qdrant:6333")
        col_info = qdrant_client.get_collection(collection_name)
        if col_info.config.params.vectors.size != 1024:
            qdrant_client.delete_collection(collection_name)
            from qdrant_client.models import VectorParams, Distance
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )
    except Exception:
        pass # Collection might not exist yet, handled by QdrantVectorStore

    response = requests.get(file_url, stream=True)
    if response.status_code != 200:
        raise Exception(f"Failed to download document from {file_url}")
    
    text_content = ""
    
    # We use a temporary file to save the download for PyMuPDF
    with tempfile.NamedTemporaryFile(delete=True) as temp_file:
        for chunk in response.iter_content(chunk_size=8192):
            temp_file.write(chunk)
        temp_file.flush()
        
        # Open with PyMuPDF
        try:
            doc = fitz.open(temp_file.name)
            for page in doc:
                text_content += page.get_text()
            doc.close()
        except Exception as e:
            # Fallback or just raise if not PDF/supported
            raise Exception(f"Failed to parse document: {str(e)}")

    if not text_content.strip():
        print("Warning: Extracted document text is empty.")
        return

    # Split the text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = text_splitter.split_text(text_content)
    
    # Convert to LangChain Documents
    documents = [
        Document(page_content=chunk, metadata=metadata) for chunk in chunks
    ]
    
    # Add to Qdrant
    vector_store = get_vector_store()
    vector_store.add_documents(documents)
    print(f"Ingested {len(documents)} chunks from {file_url} into Qdrant.")
