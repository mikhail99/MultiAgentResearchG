#!/usr/bin/env python3
"""
Startup script for FastAPI backend server
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the parent directory to Python path
backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

def main():
    """Start the FastAPI server"""
    
    # Configuration
    host = os.getenv("FASTAPI_HOST", "0.0.0.0")
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    reload = os.getenv("FASTAPI_RELOAD", "true").lower() == "true"
    log_level = os.getenv("FASTAPI_LOG_LEVEL", "info")
    
    print("🚀 Starting Multi-Agent Research Assistant FastAPI Backend...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🔄 Reload: {reload}")
    print(f"📝 Log Level: {log_level}")
    print("=" * 60)
    
    # Start the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level,
        access_log=True
    )

if __name__ == "__main__":
    main()
