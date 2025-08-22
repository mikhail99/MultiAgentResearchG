#!/usr/bin/env python3
"""
FastAPI Backend for Multi-Agent Research Assistant
Provides tool endpoints for research agents including ChromaDB search
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uvicorn
import os
import sys
import logging
from datetime import datetime

# Add the parent directory to path to import chromadb_search_tool
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from chromadb_search_tool import search_papers_for_fastapi, ChromaDBSearchTool
except ImportError:
    print("Warning: chromadb_search_tool not found. ChromaDB search will be disabled.")
    search_papers_for_fastapi = None
    ChromaDBSearchTool = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Multi-Agent Research Assistant API",
    description="FastAPI backend for research agent tools including ChromaDB search",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class ToolRequest(BaseModel):
    agent_name: str
    task: str
    query: str
    metadata: Dict[str, Any] = {}
    id: Optional[str] = ""

class ToolResponse(BaseModel):
    result: str
    success: bool
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, str]

# Global search tool instance
search_tool = None


def initialize_search_tool():
    """Initialize ChromaDB search tool"""
    global search_tool
    if ChromaDBSearchTool:
        try:
            # Build absolute path to ChromaDB directory regardless of CWD
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            chroma_db_path = os.path.join(project_root, 'backend', 'data', 'chromadb')

            search_tool = ChromaDBSearchTool(db_path=chroma_db_path)
            if getattr(search_tool, 'collection', None):
                logger.info("✅ ChromaDB search tool initialized successfully")
            else:
                logger.warning("⚠️  ChromaDB search tool created but collection is unavailable")
                search_tool = None
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB search tool: {e}")
            search_tool = None
    else:
        logger.warning("⚠️ ChromaDB search tool not available")

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting Multi-Agent Research Assistant API...")
    initialize_search_tool()

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Agent Research Assistant API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services = {
        "api": "healthy",
        "chromadb": "healthy" if search_tool else "unavailable"
    }
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        services=services
    )

@app.post("/tool", response_model=ToolResponse)
async def execute_tool(request: ToolRequest):
    """
    Execute a tool for a research agent
    
    Supported tasks:
    - local_search: Search ChromaDB for research papers
    - web_search: Web search (placeholder for future implementation)
    - save_results: Save results (placeholder for future implementation)
    """
    logger.info(f"🔧 Tool request: {request.agent_name} -> {request.task}")
    
    try:
        if request.task == "local_search":
            if not search_tool:
                return ToolResponse(
                    result="ChromaDB search tool not available",
                    success=False,
                    error="ChromaDB search tool not initialized"
                )
            
            # Use the global search tool instance
            search_results = search_tool.search(request.query, n_results=3)
            
            if not search_results["success"]:
                return ToolResponse(
                    result=f"Search failed: {search_results.get('error', 'Unknown error')}",
                    success=False,
                    error=search_results.get('error', 'Unknown error')
                )
            
            if not search_results["results"]:
                result = f"No relevant papers found for query: '{request.query}'"
            else:
                # Filter out very low similarity results
                relevant_results = [r for r in search_results["results"] if r["similarity_score"] > 0.1]
                
                if not relevant_results:
                    result = f"No sufficiently relevant papers found for query: '{request.query}'. The available papers are about LLM reasoning agents and multi-agent systems."
                else:
                    # Format results for LLM consumption
                    result = f"# Research Papers Search Results\n\n"
                    result += f"**Query:** {request.query}\n"
                    result += f"**Found:** {len(relevant_results)} relevant papers\n\n"
                    
                    for i, search_result in enumerate(relevant_results, 1):
                        paper_id = search_result["paper_id"]
                        filename = search_result["filename"]
                        chunk_id = search_result["chunk_id"]
                        headers = search_result["headers"]
                        similarity = search_result["similarity_score"]
                        content = search_result["content"]
                        
                        # Truncate content for readability
                        content_preview = content[:500] + "..." if len(content) > 500 else content
                        
                        result += f"## {i}. {paper_id} - Chunk {chunk_id} (Similarity: {similarity:.2f})\n"
                        result += f"**File:** {filename}\n"
                        if headers:
                            result += f"**Section:** {headers}\n"
                        result += f"**Chunk Size:** {search_result['chunk_size']} chars\n\n"
                        result += f"{content_preview}\n\n"
                        result += "---\n\n"
            
            return ToolResponse(
                result=result,
                success=True,
                metadata={
                    "tool_type": "local_search",
                    "query": request.query,
                    "timestamp": datetime.now().isoformat()
                }
            )
        
        elif request.task == "web_search":
            # Placeholder for web search implementation
            return ToolResponse(
                result="Web search not yet implemented. This is a placeholder response.",
                success=True,
                error=None
            )
        
        elif request.task == "save_results":
            # Placeholder for save results implementation
            return ToolResponse(
                result="Save results not yet implemented. This is a placeholder response.",
                success=True,
                error=None
            )
        
        else:
            return ToolResponse(
                result=f"Unknown task: {request.task}",
                success=False,
                error=f"Unsupported task: {request.task}"
            )
    
    except Exception as e:
        logger.error(f"❌ Tool execution error: {str(e)}")
        return ToolResponse(
            result=f"Tool execution failed: {str(e)}",
            success=False,
            error=str(e)
        )

@app.get("/search/stats")
async def get_search_stats():
    """Get ChromaDB collection statistics"""
    if not search_tool:
        raise HTTPException(status_code=503, detail="ChromaDB search tool not available")
    
    try:
        stats = search_tool.get_collection_stats()
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error getting search stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get search stats: {str(e)}")

@app.post("/search/test")
async def test_search(query: str = "reasoning agents", n_results: int = 2):
    """Test ChromaDB search functionality"""
    if not search_tool:
        raise HTTPException(status_code=503, detail="ChromaDB search tool not available")
    
    try:
        results = search_tool.search(query, n_results)
        return {
            "success": results["success"],
            "query": query,
            "results": results.get("results", []),
            "total_found": results.get("total_found", 0),
            "error": results.get("error"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error testing search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search test failed: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return {"error": "Endpoint not found", "path": request.url.path}

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: HTTPException):
    logger.error(f"Internal server error: {exc.detail}")
    return {"error": "Internal server error", "detail": str(exc.detail)}

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
