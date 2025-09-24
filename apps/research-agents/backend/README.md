# Research Agents Backend

This is the FastAPI backend for the Research Agents application. It provides API endpoints for research agents to access tools, specifically arXiv paper search functionality.

## Prerequisites

- Conda environment named `research-agents`
- Python 3.8 or higher

## Features

- arXiv paper search via API endpoints
- CORS support for frontend integration
- Health check endpoints
- Tool execution endpoint for agent tasks

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /tool` - Execute tool tasks (supports `arxiv_search`)
- `GET /arxiv/search` - Direct arXiv search endpoint

## Installation

1. Activate the conda environment:
   ```bash
   conda activate research-agents
   ```

2. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Method 1: Using the startup script
```bash
python start_server.py
```

### Method 2: Direct execution
```bash
python main.py
```

### Method 3: Using the shell script (with conda environment)
```bash
./start.sh
```

The server will start on `http://0.0.0.0:8001` by default.

## Environment Variables

- `FASTAPI_HOST` - Host address (default: 0.0.0.0)
- `FASTAPI_PORT` - Port number (default: 8001)
- `FASTAPI_RELOAD` - Enable auto-reload (default: true)
- `FASTAPI_LOG_LEVEL` - Log level (default: info)

## Usage

### Search for arXiv papers

Using the tool endpoint:
```json
POST /tool
{
  "agent_name": "ResearchAgent",
  "task": "arxiv_search",
  "query": "machine learning"
}
```

Using the direct endpoint:
```
GET /arxiv/search?query=machine learning&max_results=5
```