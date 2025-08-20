#!/usr/bin/env python3
"""
ChromaDB search tool for FastAPI integration
This can be used as a local search tool in your FastAPI backend
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import os

class ChromaDBSearchTool:
    """ChromaDB search tool for research papers"""
    
    def __init__(self, db_path: str = "backend/data/chromadb", collection_name: str = "llm_reasoning_agents_papers"):
        self.db_path = db_path
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB client and collection"""
        try:
            self.client = chromadb.PersistentClient(
                path=self.db_path,
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_collection(name=self.collection_name)
            print(f"✅ ChromaDB initialized: {self.collection_name}")
        except Exception as e:
            print(f"❌ Error initializing ChromaDB: {str(e)}")
            self.client = None
            self.collection = None
    
    def search(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """
        Search the collection for relevant document chunks
        
        Args:
            query: Search query string
            n_results: Number of results to return
            
        Returns:
            Dictionary with search results and metadata
        """
        if not self.collection:
            return {
                "success": False,
                "error": "ChromaDB not initialized",
                "results": []
            }
        
        try:
            # Perform search
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {}
                    distance = results['distances'][0][i] if results['distances'] and results['distances'][0] else 0
                    
                    formatted_results.append({
                        "content": doc,
                        "metadata": metadata,
                        "similarity_score": 1 - distance,  # Convert distance to similarity
                        "paper_id": metadata.get('paper_id', 'unknown'),
                        "filename": metadata.get('filename', 'unknown'),
                        "chunk_id": metadata.get('chunk_id', 'unknown'),
                        "headers": metadata.get('headers', ''),
                        "chunk_size": metadata.get('chunk_size', 0)
                    })
            
            return {
                "success": True,
                "query": query,
                "results": formatted_results,
                "total_found": len(formatted_results)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": []
            }
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if not self.collection:
            return {"error": "Collection not available"}
        
        try:
            count = self.collection.count()
            return {
                "total_documents": count,
                "collection_name": self.collection_name,
                "db_path": self.db_path
            }
        except Exception as e:
            return {"error": str(e)}

# Example usage for FastAPI integration
def search_papers_for_fastapi(agent_name: str, task: str, query: str, metadata: Optional[Dict] = None) -> str:
    """
    Function to be called from FastAPI /tool endpoint
    
    Args:
        agent_name: Name of the agent making the request
        task: Task type (should be "local_search")
        query: Search query
        metadata: Additional metadata
        
    Returns:
        Formatted search results as string
    """
    if task != "local_search":
        return "Error: This tool only supports 'local_search' task"
    
    # Initialize search tool
    search_tool = ChromaDBSearchTool()
    
    # Perform search
    results = search_tool.search(query, n_results=3)
    
    if not results["success"]:
        return f"Search failed: {results.get('error', 'Unknown error')}"
    
    if not results["results"]:
        return f"No relevant papers found for query: '{query}'"
    
    # Format results for LLM consumption
    formatted_output = f"# Research Papers Search Results\n\n"
    formatted_output += f"**Query:** {query}\n"
    formatted_output += f"**Found:** {results['total_found']} relevant papers\n\n"
    
    for i, result in enumerate(results["results"], 1):
        paper_id = result["paper_id"]
        filename = result["filename"]
        chunk_id = result["chunk_id"]
        headers = result["headers"]
        similarity = result["similarity_score"]
        content = result["content"]
        
        # Truncate content for readability
        content_preview = content[:500] + "..." if len(content) > 500 else content
        
        formatted_output += f"## {i}. {paper_id} - Chunk {chunk_id} (Similarity: {similarity:.2f})\n"
        formatted_output += f"**File:** {filename}\n"
        if headers:
            formatted_output += f"**Section:** {headers}\n"
        formatted_output += f"**Chunk Size:** {result['chunk_size']} chars\n\n"
        formatted_output += f"{content_preview}\n\n"
        formatted_output += "---\n\n"
    
    return formatted_output

# Example FastAPI endpoint integration
"""
# In your FastAPI app:
from chromadb_search_tool import search_papers_for_fastapi

@app.post("/tool")
async def execute_tool(request: ToolRequest):
    if request.task == "local_search":
        result = search_papers_for_fastapi(
            agent_name=request.agent_name,
            task=request.task,
            query=request.query,
            metadata=request.metadata
        )
        return {"result": result, "success": True}
    # ... other tools
"""

if __name__ == "__main__":
    # Test the search functionality
    print("🧪 Testing ChromaDB Search Tool...")
    
    search_tool = ChromaDBSearchTool()
    
    # Test search
    test_query = "reasoning agents"
    results = search_tool.search(test_query, n_results=2)
    
    if results["success"]:
        print(f"✅ Search successful for '{test_query}'")
        print(f"📄 Found {results['total_found']} results")
        
        for i, result in enumerate(results["results"], 1):
            print(f"  {i}. {result['paper_id']} (Score: {result['similarity_score']:.2f})")
    else:
        print(f"❌ Search failed: {results.get('error', 'Unknown error')}")
    
    # Show collection stats
    stats = search_tool.get_collection_stats()
    print(f"📊 Collection stats: {stats}")
