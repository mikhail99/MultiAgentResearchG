#!/usr/bin/env python3
"""
FastAPI Backend for Research Agents
Provides tool endpoints for research agents including arXiv paper search
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
import json

# Add the current directory to path to import arxiv_scraper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from arxiv_scraper import ArXivScraper, search_arxiv_papers
except ImportError as e:
    print(f"Error importing arxiv_scraper: {e}")
    ArXivScraper = None
    search_arxiv_papers = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Research Agents API",
    description="FastAPI backend for research agent tools including arXiv paper search",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],  # Vite dev server
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

# Global scraper instance
scraper = None

def initialize_scraper():
    """Initialize arXiv scraper"""
    global scraper
    if ArXivScraper:
        try:
            scraper = ArXivScraper()
            logger.info("✅ arXiv scraper initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize arXiv scraper: {e}")
            scraper = None
    else:
        logger.warning("⚠️ arXiv scraper not available")

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting Research Agents API...")
    initialize_scraper()

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Research Agents API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services = {
        "api": "healthy",
        "arxiv_scraper": "healthy" if scraper else "unavailable"
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
    - arxiv_search: Search arXiv papers
    """
    logger.info(f"🔧 Tool request: {request.agent_name} -> {request.task}")
    
    try:
        if request.task == "arxiv_search":
            if not scraper:
                return ToolResponse(
                    result="arXiv scraper not available",
                    success=False,
                    error="arXiv scraper not initialized"
                )
            
            # Search for papers using the scraper
            search_results = scraper.search_papers(request.query, max_results=5)
            
            if not search_results["success"]:
                return ToolResponse(
                    result=f"Search failed: {search_results.get('error', 'Unknown error')}",
                    success=False,
                    error=search_results.get('error', 'Unknown error')
                )
            
            if not search_results["results"]:
                result = f"No papers found for query: '{request.query}'"
            else:
                # Format results for LLM consumption
                result = f"# arXiv Papers Search Results\n\n"
                result += f"**Query:** {request.query}\n"
                result += f"**Found:** {search_results['total_results']} papers\n"
                result += f"**Source:** {search_results['source']}\n\n"
                
                for i, paper in enumerate(search_results["results"], 1):
                    result += f"## {i}. {paper['title']}\n"
                    
                    if paper['arxiv_id']:
                        result += f"**arXiv ID:** {paper['arxiv_id']}\n"
                    
                    if paper['authors']:
                        result += f"**Authors:** {', '.join(paper['authors'])}\n"
                    
                    if paper['year']:
                        result += f"**Year:** {paper['year']}\n"
                    
                    if paper['arxiv_url']:
                        result += f"**URL:** {paper['arxiv_url']}\n"
                    
                    if paper['abstract']:
                        # Truncate abstract for readability
                        abstract = paper['abstract'][:500] + "..." if len(paper['abstract']) > 500 else paper['abstract']
                        result += f"**Abstract:** {abstract}\n"
                    
                    result += "\n---\n\n"
            
            return ToolResponse(
                result=result,
                success=True,
                metadata={
                    "tool_type": "arxiv_search",
                    "query": request.query,
                    "timestamp": datetime.now().isoformat()
                }
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

@app.get("/arxiv/search")
async def search_arxiv(query: str = "machine learning", max_results: int = 5):
    """Direct endpoint to search arXiv papers"""
    if not scraper:
        raise HTTPException(status_code=503, detail="arXiv scraper not available")
    
    try:
        results = scraper.search_papers(query, max_results)
        return {
            "success": results["success"],
            "query": query,
            "results": results.get("results", []),
            "total_found": results.get("total_results", 0),
            "source": results.get("source", ""),
            "error": results.get("error"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error searching arXiv: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return {"error": "Endpoint not found", "path": request.url.path}

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    if hasattr(exc, 'detail'):
        logger.error(f"Internal server error: {exc.detail}")
        return {"error": "Internal server error", "detail": str(exc.detail)}
    else:
        logger.error(f"Internal server error: {str(exc)}")
        return {"error": "Internal server error", "detail": str(exc)}

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )