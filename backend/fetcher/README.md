# arXiv Metadata Fetcher

This directory contains scripts to extract arXiv IDs from PDF filenames, fetch metadata from arXiv API, and load the data into ChromaDB.

## Overview

The fetcher consists of two steps:

1. **Extract arXiv IDs and fetch metadata** from arXiv API
2. **Load metadata** into a ChromaDB collection

## Files

- `arxiv_id_reader.py` - Step 1: Extract arXiv IDs and fetch metadata from arXiv API
- `arxiv_to_chromadb.py` - Step 2: Load metadata into ChromaDB
- `requirements.txt` - Dependencies
- `README.md` - This file

## Setup

### 1. Install Dependencies

```bash
cd backend/fetcher
pip install -r requirements.txt
```

### 2. Ensure PDF Files Exist

Make sure you have PDF files in the collection directory:
```
backend/data/collections/{collection_name}/pdfs/
├── 2402.01622.pdf
├── 2402.01521.pdf
└── ...
```

## Usage

### Step 1: Extract arXiv IDs and Fetch Metadata

```bash
cd backend/fetcher
python arxiv_id_reader.py LLM_Reasoning_Agents
```

This will:
- Scan `backend/data/collections/LLM_Reasoning_Agents/pdfs/`
- Extract arXiv IDs from filenames
- Fetch metadata from arXiv API (with rate limiting)
- Save to `backend/data/collections/LLM_Reasoning_Agents/arxiv_metadata.csv`

### Step 2: Load into ChromaDB

```bash
python arxiv_to_chromadb.py LLM_Reasoning_Agents
```

This will:
- Load CSV data
- Create/update ChromaDB collection: `LLM_Reasoning_Agents_arxiv_metadata`
- Test the collection with a sample query

## Output Files

### CSV File (in collection directory)

- `arxiv_metadata.csv` - Full metadata from arXiv API including:
  - arXiv ID, title, abstract
  - Authors, publication date, categories
  - URLs, DOI, comments, journal references

### ChromaDB Collection

- Collection name: `{collection_name}_arxiv_metadata`
- Content: Title + Abstract for each paper
- Metadata: Full arXiv metadata (authors, dates, categories, etc.)

## Configuration

### Rate Limiting

- **Batch size**: 20 papers per request
- **Delay**: 5 seconds between batches
- **Retries**: 3 attempts per request

### arXiv ID Pattern

The scripts expect PDF filenames in the format: `YYYY.NNNNN.pdf`
- Example: `2402.01622.pdf`
