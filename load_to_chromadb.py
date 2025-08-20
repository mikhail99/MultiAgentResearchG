#!/usr/bin/env python3
"""
Script to load converted Markdown files into ChromaDB collection
Usage: python load_to_chromadb.py
"""

import os
import glob
from pathlib import Path
import chromadb
from chromadb.config import Settings
import hashlib
from datetime import datetime
from typing import List, Dict, Any

# Import LangChain text splitter
try:
    from langchain.text_splitter import MarkdownTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("⚠️  LangChain not available. Install with: pip install langchain")

def chunk_markdown_with_langchain(content: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Chunk markdown document using LangChain's MarkdownTextSplitter
    
    Args:
        content: Full markdown content
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks in characters
        
    Returns:
        List of chunks with metadata
    """
    if not LANGCHAIN_AVAILABLE:
        raise ImportError("LangChain is required for this function. Install with: pip install langchain")
    
    # Initialize LangChain's MarkdownTextSplitter
    text_splitter = MarkdownTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            # Markdown-specific separators (in order of preference)
            "\n# ",      # Headers
            "\n## ",
            "\n### ",
            "\n#### ",
            "\n##### ",
            "\n###### ",
            "\n\n",      # Paragraphs
            "\n",        # Lines
            " ",         # Words
            ""           # Characters
        ]
    )
    
    # Split the text
    chunks = text_splitter.split_text(content)
    
    # Convert to our format with metadata
    chunk_data = []
    for i, chunk_text in enumerate(chunks):
        # Extract headers from the chunk (simple regex for demo)
        import re
        headers = re.findall(r'^(#{1,6}\s+.+)$', chunk_text, re.MULTILINE)
        
        chunk_metadata = {
            "chunk_id": i,
            "chunk_size": len(chunk_text),
            "headers": headers,
            "section_type": "content"
        }
        
        chunk_data.append({
            "content": chunk_text.strip(),
            "metadata": chunk_metadata
        })
    
    return chunk_data

def chunk_markdown_document(content: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Intelligently chunk a markdown document (fallback if LangChain not available)
    
    Args:
        content: Full markdown content
        chunk_size: Target chunk size in characters
        overlap: Overlap between chunks in characters
        
    Returns:
        List of chunks with metadata
    """
    if LANGCHAIN_AVAILABLE:
        return chunk_markdown_with_langchain(content, chunk_size, overlap)
    
    # Fallback to simple chunking if LangChain not available
    chunks = []
    import re
    
    # Simple splitting by headers and size
    header_pattern = r'^(#{1,6}\s+.+)$'
    sections = re.split(header_pattern, content, flags=re.MULTILINE)
    
    current_chunk = ""
    current_headers = []
    chunk_id = 0
    
    for i, section in enumerate(sections):
        # Check if this is a header
        if re.match(header_pattern, section, re.MULTILINE):
            current_headers.append(section.strip())
            continue
        
        # Add section to current chunk
        if current_chunk:
            current_chunk += "\n\n" + section
        else:
            current_chunk = section
        
        # Check if chunk is ready to be saved
        if len(current_chunk) >= chunk_size:
            # Try to break at sentence boundaries
            sentences = re.split(r'(?<=[.!?])\s+', current_chunk)
            
            if len(sentences) > 1:
                # Find a good breaking point
                break_point = len(sentences) // 2
                chunk_text = ' '.join(sentences[:break_point])
                remaining_text = ' '.join(sentences[break_point:])
            else:
                # No good sentence break, use character limit
                chunk_text = current_chunk[:chunk_size]
                remaining_text = current_chunk[chunk_size:]
            
            # Create chunk metadata
            chunk_metadata = {
                "chunk_id": chunk_id,
                "chunk_size": len(chunk_text),
                "headers": current_headers.copy(),
                "section_type": "content"
            }
            
            chunks.append({
                "content": chunk_text.strip(),
                "metadata": chunk_metadata
            })
            
            # Keep overlap for next chunk
            if overlap > 0 and len(chunk_text) > overlap:
                current_chunk = chunk_text[-overlap:] + "\n\n" + remaining_text
            else:
                current_chunk = remaining_text
            
            chunk_id += 1
    
    # Add final chunk if there's content
    if current_chunk.strip():
        chunk_metadata = {
            "chunk_id": chunk_id,
            "chunk_size": len(current_chunk),
            "headers": current_headers.copy(),
            "section_type": "content"
        }
        
        chunks.append({
            "content": current_chunk.strip(),
            "metadata": chunk_metadata
        })
    
    return chunks

def load_markdown_to_chromadb():
    """Load all Markdown files from the markdown directory into ChromaDB"""
    
    # Configuration
    MARKDOWN_DIR = "backend/data/collections/LLM_Reasoning_Agents/markdown"
    COLLECTION_NAME = "llm_reasoning_agents_papers"
    CHROMA_DB_PATH = "backend/data/chromadb"
    
    # Chunking configuration
    CHUNK_SIZE = 1000  # characters
    CHUNK_OVERLAP = 200  # characters
    
    # Create ChromaDB directory if it doesn't exist
    os.makedirs(CHROMA_DB_PATH, exist_ok=True)
    
    print("🚀 Initializing ChromaDB...")
    
    # Check LangChain availability
    if LANGCHAIN_AVAILABLE:
        print("✅ Using LangChain MarkdownTextSplitter for intelligent chunking")
    else:
        print("⚠️  Using fallback chunking (install langchain for better results)")
    
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
    
    # Get or create collection
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
        print(f"📚 Using existing collection: {COLLECTION_NAME}")
    except:
        collection = client.create_collection(
            name=COLLECTION_NAME,
            metadata={"description": "LLM Reasoning Agents research papers converted from PDF to Markdown"}
        )
        print(f"📚 Created new collection: {COLLECTION_NAME}")
    
    # Find all markdown files
    markdown_files = glob.glob(os.path.join(MARKDOWN_DIR, "*.md"))
    
    if not markdown_files:
        print(f"❌ No markdown files found in {MARKDOWN_DIR}")
        return
    
    print(f"📁 Found {len(markdown_files)} markdown files")
    print(f"🔪 Chunking with size: {CHUNK_SIZE} chars, overlap: {CHUNK_OVERLAP} chars")
    print("🔄 Loading files into ChromaDB...")
    
    # Prepare data for batch insertion
    documents = []
    metadatas = []
    ids = []
    
    total_chunks = 0
    
    for file_path in markdown_files:
        try:
            # Read markdown content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                print(f"⚠️  Skipping empty file: {os.path.basename(file_path)}")
                continue
            
            # Extract filename and create base ID
            filename = os.path.basename(file_path)
            paper_id = filename.replace('.md', '')
            
            # Chunk the document
            chunks = chunk_markdown_document(content, CHUNK_SIZE, CHUNK_OVERLAP)
            
            print(f"📄 {filename}: {len(chunks)} chunks created")
            
            # Process each chunk
            for chunk_data in chunks:
                chunk_content = chunk_data["content"]
                chunk_metadata = chunk_data["metadata"]
                
                # Create unique ID for this chunk
                chunk_hash = hashlib.md5(chunk_content.encode()).hexdigest()[:8]
                unique_id = f"{paper_id}_chunk_{chunk_metadata['chunk_id']}_{chunk_hash}"
                
                # Prepare metadata
                metadata = {
                    "filename": filename,
                    "paper_id": paper_id,
                    "chunk_id": chunk_metadata["chunk_id"],
                    "chunk_size": chunk_metadata["chunk_size"],
                    "headers": " | ".join(chunk_metadata["headers"][-3:]),  # Last 3 headers
                    "section_type": chunk_metadata["section_type"],
                    "source": "pdf_conversion",
                    "conversion_tool": "mineru",
                    "chunking_tool": "langchain" if LANGCHAIN_AVAILABLE else "custom",
                    "word_count": len(chunk_content.split()),
                    "loaded_at": datetime.now().isoformat(),
                    "file_path": file_path
                }
                
                # Add to batch
                documents.append(chunk_content)
                metadatas.append(metadata)
                ids.append(unique_id)
                total_chunks += 1
            
        except Exception as e:
            print(f"❌ Error processing {file_path}: {str(e)}")
            continue
    
    if not documents:
        print("❌ No valid documents to insert")
        return
    
    # Insert documents into ChromaDB
    try:
        print(f"📤 Inserting {len(documents)} chunks into ChromaDB...")
        
        # Check if documents already exist to avoid duplicates
        existing_ids = []
        if collection.count() > 0:
            # Get existing IDs (this is a simplified check)
            existing_ids = [id for id in ids if collection.get(ids=[id])['ids']]
        
        # Filter out existing documents
        new_documents = []
        new_metadatas = []
        new_ids = []
        
        for i, doc_id in enumerate(ids):
            if doc_id not in existing_ids:
                new_documents.append(documents[i])
                new_metadatas.append(metadatas[i])
                new_ids.append(doc_id)
        
        if new_documents:
            collection.add(
                documents=new_documents,
                metadatas=new_metadatas,
                ids=new_ids
            )
            print(f"✅ Successfully inserted {len(new_documents)} new chunks")
        else:
            print("ℹ️  All chunks already exist in collection")
        
        # Print collection statistics
        total_count = collection.count()
        print(f"📊 Collection now contains {total_count} chunks")
        print(f"📄 Average chunks per paper: {total_count / len(markdown_files):.1f}")
        
        # Show some sample queries
        print("\n🔍 Sample queries you can try:")
        print("collection.query(query_texts=['reasoning agents'], n_results=3)")
        print("collection.query(query_texts=['chain of thought'], n_results=3)")
        print("collection.query(query_texts=['multi-agent'], n_results=3)")
        
    except Exception as e:
        print(f"❌ Error inserting documents: {str(e)}")
        return
    
    print("\n🎉 ChromaDB loading complete!")
    print(f"📁 Database location: {CHROMA_DB_PATH}")
    print(f"📚 Collection name: {COLLECTION_NAME}")
    print(f"🔪 Chunking strategy: {CHUNK_SIZE} chars with {CHUNK_OVERLAP} overlap")
    print(f"🛠️  Chunking tool: {'LangChain MarkdownTextSplitter' if LANGCHAIN_AVAILABLE else 'Custom implementation'}")

def test_collection():
    """Test the collection with a sample query"""
    
    CHROMA_DB_PATH = "backend/data/chromadb"
    COLLECTION_NAME = "llm_reasoning_agents_papers"
    
    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        collection = client.get_collection(name=COLLECTION_NAME)
        
        print("\n🧪 Testing collection with sample query...")
        
        # Test query
        results = collection.query(
            query_texts=["reasoning agents"],
            n_results=2
        )
        
        if results['documents']:
            print("✅ Collection test successful!")
            print(f"📄 Found {len(results['documents'][0])} relevant chunks")
            
            # Show first result metadata
            if results['metadatas'] and results['metadatas'][0]:
                first_metadata = results['metadatas'][0][0]
                print(f"📋 Sample chunk: {first_metadata.get('paper_id', 'Unknown')} - Chunk {first_metadata.get('chunk_id', 'Unknown')}")
                print(f"📝 Headers: {first_metadata.get('headers', 'None')}")
                print(f"🛠️  Chunking tool: {first_metadata.get('chunking_tool', 'Unknown')}")
        else:
            print("ℹ️  No results found for test query")
            
    except Exception as e:
        print(f"❌ Error testing collection: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("📚 ChromaDB Markdown Loader (with LangChain Chunking)")
    print("=" * 60)
    
    # Load documents
    load_markdown_to_chromadb()
    
    # Test the collection
    test_collection()
    
    print("\n" + "=" * 60)
    print("✨ Script completed!")
    print("=" * 60)
