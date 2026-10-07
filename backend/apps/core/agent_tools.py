import json
from langchain_core.tools import tool
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from langchain_ollama import OllamaEmbeddings
from django.db import connection

@tool
def list_database_tables() -> str:
    """
    List all relevant database tables in the PostgreSQL database.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (
                    table_name LIKE 'narrative_%' OR 
                    table_name LIKE 'logistics_%' OR 
                    table_name LIKE 'financials_%' OR 
                    table_name LIKE 'shots_%' OR 
                    table_name LIKE 'breakdown_%'
                );
            """)
            rows = cursor.fetchall()
            tables = [row[0] for row in rows]
            return json.dumps(tables)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_database_schema(table_name: str) -> str:
    """
    Get the database schema (columns and data types) for a given table.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = %s;
            """, [table_name])
            rows = cursor.fetchall()
            schema = [{"column_name": row[0], "data_type": row[1]} for row in rows]
            return json.dumps(schema)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def execute_read_only_sql(sql_query: str) -> str:
    """
    Execute a read-only SQL query against the PostgreSQL database.
    """
    forbidden_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'COMMIT']
    upper_query = sql_query.upper()
    
    for kw in forbidden_keywords:
        if kw in upper_query:
            return "Error: Query rejected. Only SELECT statements are allowed."
            
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            rows = cursor.fetchmany(50)
            
            # Get column names
            columns = [col[0] for col in cursor.description]
            
            # Map rows to column names
            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))
                
            # Handle datetime or UUID serialization issues by converting everything to strings first if needed
            # For simplicity, using default json dumps which might fail on complex objects, so we stringify values
            stringified_results = [{k: str(v) for k, v in row.items()} for row in results]
            
            return json.dumps(stringified_results)
    except Exception as e:
        return f"SQL Error: {str(e)}"

@tool
def search_studio_documents(query: str) -> str:
    """
    Search across all uploaded studio documents (PDFs, call sheets, continuity notes) 
    to answer semantic queries using RAG.
    """
    try:
        embeddings = OllamaEmbeddings(
            model="bge-m3:latest",
            base_url="http://host.docker.internal:11434"
        )
        qdrant_client = QdrantClient(url="http://qdrant:6333")
        store = QdrantVectorStore(
            client=qdrant_client,
            collection_name="studio_documents",
            embedding=embeddings,
        )
        
        results = store.similarity_search(query, k=4)
        
        formatted_results = []
        for res in results:
            formatted_results.append({
                "content": res.page_content,
                "metadata": res.metadata
            })
            
        return json.dumps(formatted_results)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def analyze_production_image(image_url: str, question: str) -> str:
    """
    Analyze a production image (storyboard, costume reference, VFX plate) to answer questions about it.
    """
    from langchain_ollama import ChatOllama
    from langchain_core.messages import HumanMessage
    
    try:
        vision_llm = ChatOllama(
            model="hf.co/mrader/Qwen3-VL-8B-Instruct-GGUF:Q4_K_M", 
            base_url="http://host.docker.internal:11434", 
            temperature=0.1
        )
        msg = HumanMessage(content=[
            {"type": "text", "text": question}, 
            {"type": "image_url", "image_url": {"url": image_url}}
        ])
        response = vision_llm.invoke([msg])
        return response.content
    except Exception as e:
        return f"Vision Analysis Failed: {str(e)}"
