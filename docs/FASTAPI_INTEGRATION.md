# FastAPI Backend Integration Guide

This guide explains how to set up and use the FastAPI backend that connects the research agent to ChromaDB search functionality.

## 🎯 Overview

The FastAPI backend provides a bridge between the React frontend and ChromaDB, enabling the research agent to search through stored research papers and use the results in its analysis.

## 🏗️ Architecture

```
┌─────────────────┐    HTTP Requests    ┌─────────────────┐    ChromaDB    ┌─────────────────┐
│   React Frontend │ ──────────────────► │  FastAPI Backend │ ─────────────► │   ChromaDB      │
│                 │                     │                 │                │                 │
│ - Research Agent│                     │ - Tool Endpoints│                │ - Research      │
│ - Tool Service  │                     │ - Search Logic  │                │   Papers        │
│ - UI Components │                     │ - Error Handling│                │ - Vector Index  │
└─────────────────┘                     └─────────────────┘                └─────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (including FastAPI)
pip install -r requirements.txt
```

### 2. Set Up ChromaDB

```bash
# Load research papers into ChromaDB
python load_to_chromadb.py
```

### 3. Start the Backend

```bash
# Option A: Use the startup script (recommended)
./start_backend.sh

# Option B: Manual start
cd backend
python start_server.py

# Option C: Direct uvicorn
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start the Frontend

```bash
# In a new terminal
npm run dev
```

## 📡 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint with API info |
| `/health` | GET | Health check and service status |
| `/tool` | POST | Execute research tools |
| `/docs` | GET | Interactive API documentation |

### Search Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search/stats` | GET | ChromaDB collection statistics |
| `/search/test` | POST | Test search functionality |

## 🔧 Tool Integration

### Tool Request Format

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

### Tool Response Format

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

## 🔍 Supported Tools

### 1. Local Search (`local_search`)

Searches ChromaDB for relevant research papers based on the query.

**Features:**
- Semantic search using ChromaDB embeddings
- Returns formatted results with metadata
- Configurable number of results
- Similarity scoring

**Example:**
```bash
curl -X POST "http://localhost:8000/tool" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "Researcher",
    "task": "local_search",
    "query": "multi-agent reasoning",
    "metadata": {"iteration": 1}
  }'
```

### 2. Web Search (`web_search`)

**Status:** Placeholder for future implementation

### 3. Save Results (`save_results`)

**Status:** Placeholder for future implementation

## 🧪 Testing

### Run the Test Suite

```bash
cd backend
python test_backend.py
```

### Manual Testing

1. **Health Check:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Search Stats:**
   ```bash
   curl http://localhost:8000/search/stats
   ```

3. **Test Search:**
   ```bash
   curl -X POST "http://localhost:8000/search/test?query=reasoning&n_results=2"
   ```

4. **Tool Execution:**
   ```bash
   curl -X POST "http://localhost:8000/tool" \
     -H "Content-Type: application/json" \
     -d '{"agent_name":"Researcher","task":"local_search","query":"agents"}'
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FASTAPI_HOST` | `0.0.0.0` | Server host |
| `FASTAPI_PORT` | `8000` | Server port |
| `FASTAPI_RELOAD` | `true` | Enable auto-reload |
| `FASTAPI_LOG_LEVEL` | `info` | Log level |

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev server)
- `http://127.0.0.1:5173` (Alternative localhost)

To add more origins, edit `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://your-frontend-url"],
    # ...
)
```

## 🐛 Troubleshooting

### Common Issues

#### 1. ChromaDB Connection Error

**Symptoms:** `ChromaDB search tool not available` error

**Solutions:**
- Verify ChromaDB data exists: `ls backend/data/chromadb/`
- Re-run ChromaDB setup: `python load_to_chromadb.py`
- Check ChromaDB path in `chromadb_search_tool.py`

#### 2. Import Error

**Symptoms:** `ModuleNotFoundError: No module named 'chromadb_search_tool'`

**Solutions:**
- Ensure `chromadb_search_tool.py` is in the project root
- Check Python path includes project root
- Install all dependencies: `pip install -r requirements.txt`

#### 3. CORS Error

**Symptoms:** Frontend can't connect to backend

**Solutions:**
- Check backend is running on correct port
- Verify CORS origins in `backend/main.py`
- Check browser console for CORS errors

#### 4. Port Already in Use

**Symptoms:** `Address already in use` error

**Solutions:**
- Change port: `FASTAPI_PORT=8001 python start_server.py`
- Kill existing process: `lsof -ti:8000 | xargs kill -9`

### Debug Mode

Enable debug logging:

```bash
FASTAPI_LOG_LEVEL=debug python start_server.py
```

## 📊 Monitoring

### Health Check

Monitor backend health:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "healthy",
    "chromadb": "healthy"
  }
}
```

### Collection Statistics

Check ChromaDB status:

```bash
curl http://localhost:8000/search/stats
```

## 🔄 Integration with Frontend

The frontend automatically detects and uses the backend:

1. **Health Check:** Frontend checks `/health` endpoint on load
2. **Tool Execution:** Research agent calls `/tool` endpoint
3. **Error Handling:** Graceful fallback if backend unavailable
4. **Results Display:** Tool results shown in AgentCard component

### Frontend Configuration

The frontend uses these environment variables:
- `VITE_FASTAPI_URL`: Backend URL (default: `http://localhost:8000`)

## 🚀 Production Deployment

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

Set production environment variables:

```bash
export FASTAPI_HOST=0.0.0.0
export FASTAPI_PORT=8000
export FASTAPI_RELOAD=false
export FASTAPI_LOG_LEVEL=warning
```

## 📈 Performance Optimization

### Search Optimization

- **Result Limit:** Default 3 results per search
- **Chunk Size:** Optimized for LLM consumption
- **Caching:** Consider adding Redis for result caching

### Scaling Considerations

- **Load Balancing:** Use nginx for multiple backend instances
- **Database:** Consider ChromaDB clustering for large datasets
- **Caching:** Implement result caching for repeated queries

## 🔮 Future Enhancements

### Planned Features

1. **Web Search Integration:** Real web search capabilities
2. **Result Caching:** Redis-based caching for performance
3. **Advanced Search:** Filters, date ranges, paper types
4. **Batch Processing:** Multiple search queries
5. **Analytics:** Search usage and performance metrics

### Extension Points

The modular design allows easy addition of new tools:

1. Add new tool handler in `main.py`
2. Implement tool logic in separate module
3. Update frontend tool service if needed
4. Add tests for new functionality

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [API Documentation](http://localhost:8000/docs) (when server is running)
- [Project README](../README.md)
