# FastAPI Backend for Multi-Agent Research Assistant

This FastAPI backend provides tool endpoints for the research agents, including ChromaDB search functionality.

## Features

- **ChromaDB Search**: Search through research papers stored in ChromaDB
- **Tool Interface**: Standardized tool execution for research agents
- **Health Monitoring**: Health check endpoints for service monitoring
- **CORS Support**: Configured for frontend integration
- **Error Handling**: Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Verify ChromaDB Setup

Make sure ChromaDB is properly set up with research papers:

```bash
# From project root
python load_to_chromadb.py
```

### 3. Start the Server

#### Option A: Using the startup script
```bash
cd backend
python start_server.py
```

#### Option B: Direct uvicorn
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Option C: Environment variables
```bash
cd backend
FASTAPI_HOST=0.0.0.0 FASTAPI_PORT=8000 FASTAPI_RELOAD=true python start_server.py
```

## API Endpoints

### Health Check
- `GET /health` - Check service health and ChromaDB status

### Tool Execution
- `POST /tool` - Execute research tools
  - `local_search`: Search ChromaDB for research papers
  - `web_search`: Web search (placeholder)
  - `save_results`: Save results (placeholder)

### Search Management
- `GET /search/stats` - Get ChromaDB collection statistics
- `POST /search/test` - Test ChromaDB search functionality

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

## Tool Request Format

```json
{
  "agent_name": "Researcher",
  "task": "local_search",
  "query": "reasoning agents",
  "metadata": {
    "iteration": 1,
    "modelProvider": "GEMINI"
  },
  "id": "req_1234567890_abc123"
}
```

## Tool Response Format

```json
{
  "result": "# Research Papers Search Results\n\n**Query:** reasoning agents\n...",
  "success": true,
  "error": null,
  "metadata": {
    "tool_type": "local_search",
    "query": "reasoning agents",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Configuration

### Environment Variables

- `FASTAPI_HOST`: Server host (default: 0.0.0.0)
- `FASTAPI_PORT`: Server port (default: 8000)
- `FASTAPI_RELOAD`: Enable auto-reload (default: true)
- `FASTAPI_LOG_LEVEL`: Log level (default: info)

### CORS Configuration

The server is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev server)
- `http://127.0.0.1:5173` (Alternative localhost)

## Troubleshooting

### ChromaDB Connection Issues

1. Verify ChromaDB is running and accessible
2. Check the database path in `chromadb_search_tool.py`
3. Ensure research papers are loaded into ChromaDB

### CORS Issues

If you encounter CORS errors, add your frontend URL to the allowed origins in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://your-frontend-url"],
    # ...
)
```

### Import Errors

If you get import errors for `chromadb_search_tool`, ensure:
1. The file exists in the project root
2. Python path includes the project root
3. All dependencies are installed

## Development

### Running Tests

```bash
cd backend
pytest
```

### API Testing

Use the interactive documentation at `http://localhost:8000/docs` to test endpoints.

### Logs

The server logs all requests and errors. Check the console output for debugging information.

## Integration with Frontend

The frontend is already configured to use this backend through the `toolService.ts` file. The backend URL is configured via the `VITE_FASTAPI_URL` environment variable (defaults to `http://localhost:8000`).
