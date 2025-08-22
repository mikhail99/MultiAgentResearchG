#!/usr/bin/env python3
"""
Load enhanced arXiv metadata into ChromaDB collection
Usage: python arxiv_to_chromadb.py <collection_name>
"""

import os
import sys
import csv
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chromadb
from chromadb.config import Settings

def load_csv_data(collection_name: str) -> List[Dict[str, Any]]:
    """
    Load arXiv metadata from CSV file
    
    Args:
        collection_name: Name of the collection
        
    Returns:
        List of paper data dictionaries
    """
    csv_path = Path(f"../data/collections/{collection_name}/arxiv_metadata.csv")
    
    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_path}")
        print("💡 Run arxiv_id_reader.py first to create the CSV file")
        return []
    
    papers_data = []
    
    with open(csv_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Convert string fields back to lists
            if row.get('authors'):
                row['authors'] = [author.strip() for author in row['authors'].split(' | ') if author.strip()]
            else:
                row['authors'] = []
                
            if row.get('categories'):
                row['categories'] = [cat.strip() for cat in row['categories'].split(' | ') if cat.strip()]
            else:
                row['categories'] = []
            
            papers_data.append(row)
    
    print(f"📄 Loaded {len(papers_data)} papers from: {csv_path}")
    return papers_data

def create_or_get_collection(client: chromadb.PersistentClient, collection_name: str) -> chromadb.Collection:
    """
    Create or get the arxiv_metadata collection
    
    Args:
        client: ChromaDB client
        collection_name: Base collection name
        
    Returns:
        ChromaDB collection
    """
    arxiv_collection_name = f"{collection_name}_arxiv_metadata"
    
    try:
        collection = client.get_collection(name=arxiv_collection_name)
        print(f"📚 Using existing collection: {arxiv_collection_name}")
    except:
        collection = client.create_collection(
            name=arxiv_collection_name,
            metadata={
                "description": f"arXiv metadata for {collection_name} papers",
                "source": "arxiv_api",
                "created_at": datetime.now().isoformat()
            }
        )
        print(f"📚 Created new collection: {arxiv_collection_name}")
    
    return collection

def prepare_documents_for_chromadb(papers_data: List[Dict[str, Any]]) -> tuple:
    """
    Prepare paper data for ChromaDB insertion
    
    Args:
        papers_data: List of paper data dictionaries
        
    Returns:
        Tuple of (documents, metadatas, ids)
    """
    documents = []
    metadatas = []
    ids = []
    
    for paper in papers_data:
        arxiv_id = paper['arxiv_id']
        
        # Create document content (title + abstract)
        content = f"Title: {paper['title']}\n\nAbstract: {paper['abstract']}"
        
        # Prepare metadata
        metadata = {
            'arxiv_id': arxiv_id,
            'title': paper['title'],
            'authors': ' | '.join(paper['authors']),
            'published_date': paper['published_date'],
            'updated_date': paper.get('updated_date', ''),
            'categories': ' | '.join(paper['categories']),
            'arxiv_url': paper['arxiv_url'],
            'pdf_url': paper['pdf_url'],
            'doi': paper.get('doi', ''),
            'comment': paper.get('comment', ''),
            'journal_ref': paper.get('journal_ref', ''),
            'fetched_at': paper['fetched_at'],
            'source': 'arxiv_api',
            'content_type': 'metadata'
        }
        
        documents.append(content)
        metadatas.append(metadata)
        ids.append(f"arxiv_{arxiv_id}")
    
    return documents, metadatas, ids

def load_papers_to_chromadb(papers_data: List[Dict[str, Any]], collection_name: str) -> bool:
    """
    Load papers into ChromaDB collection
    
    Args:
        papers_data: List of paper data
        collection_name: Name of the collection
        
    Returns:
        True if successful, False otherwise
    """
    # Initialize ChromaDB client
    chroma_db_path = "../data/chromadb"
    os.makedirs(chroma_db_path, exist_ok=True)
    
    client = chromadb.PersistentClient(
        path=chroma_db_path,
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
    
    # Get or create collection
    collection = create_or_get_collection(client, collection_name)
    
    # Prepare data for ChromaDB
    documents, metadatas, ids = prepare_documents_for_chromadb(papers_data)
    
    if not documents:
        print("❌ No documents to insert")
        return False
    
    try:
        print(f"📤 Inserting {len(documents)} papers into ChromaDB...")
        
        # Check for existing documents to avoid duplicates
        existing_count = collection.count()
        if existing_count > 0:
            print(f"⚠️  Collection already contains {existing_count} documents")
            print("💡 Skipping insertion to avoid duplicates")
            print("💡 Use collection.reset() to clear and re-insert if needed")
            return True
        
        # Insert documents
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✅ Successfully inserted {len(documents)} papers")
        
        # Print collection statistics
        total_count = collection.count()
        print(f"📊 Collection now contains {total_count} papers")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting documents: {str(e)}")
        return False

def test_collection(collection_name: str):
    """
    Test the collection with a sample query
    
    Args:
        collection_name: Name of the collection
    """
    chroma_db_path = "../data/chromadb"
    arxiv_collection_name = f"{collection_name}_arxiv_metadata"
    
    try:
        client = chromadb.PersistentClient(
            path=chroma_db_path,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        collection = client.get_collection(name=arxiv_collection_name)
        
        print("\n🧪 Testing collection with sample query...")
        
        # Test query
        results = collection.query(
            query_texts=["reasoning agents"],
            n_results=2
        )
        
        if results['documents']:
            print("✅ Collection test successful!")
            print(f"📄 Found {len(results['documents'][0])} relevant papers")
            
            # Show first result metadata
            if results['metadatas'] and results['metadatas'][0]:
                first_metadata = results['metadatas'][0][0]
                print(f"📋 Sample paper: {first_metadata.get('title', 'Unknown')}")
                print(f"👥 Authors: {first_metadata.get('authors', 'Unknown')}")
                print(f"📅 Published: {first_metadata.get('published_date', 'Unknown')}")
        else:
            print("ℹ️  No results found for test query")
            
    except Exception as e:
        print(f"❌ Error testing collection: {str(e)}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Load arXiv metadata into ChromaDB')
    parser.add_argument('collection_name', help='Name of the collection directory')
    args = parser.parse_args()
    
    collection_name = args.collection_name
    
    print("🚀 arXiv to ChromaDB - Load Metadata into ChromaDB")
    print("=" * 60)
    print(f"📚 Collection: {collection_name}")
    
    # Load CSV data
    papers_data = load_csv_data(collection_name)
    
    if not papers_data:
        print("❌ No paper data found. Exiting.")
        sys.exit(1)
    
    # Load papers into ChromaDB
    success = load_papers_to_chromadb(papers_data, collection_name)
    
    if not success:
        print("❌ Failed to load papers into ChromaDB. Exiting.")
        sys.exit(1)
    
    # Test the collection
    test_collection(collection_name)
    
    print("\n🎉 Completed successfully!")
    print(f"📚 arXiv metadata collection: {collection_name}_arxiv_metadata")
    print(f"📊 Total papers loaded: {len(papers_data)}")

if __name__ == "__main__":
    main()
