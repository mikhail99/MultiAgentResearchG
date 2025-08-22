#!/usr/bin/env python3
"""
Extract arXiv IDs from PDF filenames and fetch metadata from arXiv API
Usage: python arxiv_id_reader.py <collection_name>
"""

import os
import sys
import csv
import re
import time
import argparse
import arxiv
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Configuration
BATCH_SIZE = 20
BATCH_DELAY = 5

def extract_arxiv_ids_from_pdfs(collection_name: str) -> List[str]:
    """
    Extract arXiv IDs from PDF filenames in the collection directory
    
    Args:
        collection_name: Name of the collection directory
        
    Returns:
        List of arXiv IDs found in PDF filenames
    """
    # Build path to PDF directory (relative to backend directory)
    pdf_dir = Path(f"../data/collections/{collection_name}/pdfs")
    
    if not pdf_dir.exists():
        print(f"❌ PDF directory not found: {pdf_dir}")
        return []
    
    print(f"📁 Scanning PDF directory: {pdf_dir}")
    
    # arXiv ID pattern: YYMM.NNNNN (e.g., 2402.01622)
    arxiv_pattern = re.compile(r'^(\d{4}\.\d{5,})\.pdf$')
    
    arxiv_ids = []
    invalid_files = []
    
    # Scan all PDF files
    for pdf_file in pdf_dir.glob("*.pdf"):
        filename = pdf_file.name
        match = arxiv_pattern.match(filename)
        
        if match:
            arxiv_id = match.group(1)
            arxiv_ids.append(arxiv_id)
            print(f"✅ Found arXiv ID: {arxiv_id} from {filename}")
        else:
            invalid_files.append(filename)
            print(f"⚠️  Warning: Invalid filename format: {filename}")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   ✅ Valid arXiv IDs found: {len(arxiv_ids)}")
    print(f"   ⚠️  Invalid filenames: {len(invalid_files)}")
    
    if invalid_files:
        print(f"   📝 Invalid files: {', '.join(invalid_files[:5])}{'...' if len(invalid_files) > 5 else ''}")
    
    return arxiv_ids

def fetch_paper_details_batch(arxiv_ids: List[str]) -> Dict[str, Any]:
    """
    Fetch detailed information for a batch of arXiv IDs
    
    Args:
        arxiv_ids: List of arXiv IDs to fetch
        
    Returns:
        Dictionary mapping arXiv ID to paper details
    """
    results = {}
    
    if not arxiv_ids:
        return results
    
    try:
        # Create arXiv client
        client = arxiv.Client(
            page_size=100,
            delay_seconds=1,
            num_retries=3
        )
        
        # Create search query for all IDs in the batch
        search = arxiv.Search(
            id_list=arxiv_ids,
            max_results=len(arxiv_ids)
        )
        
        # Process each result
        for result in client.results(search):
            try:
                arxiv_id = result.get_short_id().split('v')[0]  # Remove version suffix
                
                paper_info = {
                    'arxiv_id': arxiv_id,
                    'title': result.title,
                    'abstract': result.summary,
                    'authors': [author.name for author in result.authors],
                    'published_date': result.published.strftime('%Y-%m-%d'),
                    'updated_date': result.updated.strftime('%Y-%m-%d') if result.updated else None,
                    'categories': result.categories,
                    'arxiv_url': result.entry_id,
                    'pdf_url': result.pdf_url,
                    'doi': result.doi,
                    'comment': result.comment,
                    'journal_ref': result.journal_ref,
                    'fetched_at': datetime.now().isoformat()
                }
                
                results[arxiv_id] = paper_info
                print(f"✅ Fetched: {arxiv_id} - {result.title[:50]}...")
                
            except Exception as e:
                print(f"❌ Error extracting paper info for {arxiv_id}: {e}")
                
    except Exception as e:
        print(f"❌ Error fetching batch of papers: {e}")
    
    return results

def fetch_all_paper_details(arxiv_ids: List[str]) -> Dict[str, Any]:
    """
    Fetch details for all arXiv IDs, processing in batches
    
    Args:
        arxiv_ids: List of all arXiv IDs to fetch
        
    Returns:
        Dictionary mapping arXiv ID to paper details
    """
    all_results = {}
    total_ids = len(arxiv_ids)
    
    print(f"🔄 Fetching details for {total_ids} papers in batches of {BATCH_SIZE}")
    
    # Process in batches
    for i in range(0, total_ids, BATCH_SIZE):
        batch = arxiv_ids[i:i+BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        total_batches = (total_ids + BATCH_SIZE - 1)//BATCH_SIZE
        
        print(f"\n📦 Processing batch {batch_num}/{total_batches} ({len(batch)} papers)")
        
        # Fetch details for the batch
        batch_results = fetch_paper_details_batch(batch)
        all_results.update(batch_results)
        
        # Delay between batches to avoid rate limiting
        if i + BATCH_SIZE < total_ids:
            print(f"⏳ Waiting {BATCH_DELAY} seconds before next batch...")
            time.sleep(BATCH_DELAY)
    
    print(f"\n✅ Successfully fetched details for {len(all_results)} papers")
    
    # Report missing papers
    missing_ids = set(arxiv_ids) - set(all_results.keys())
    if missing_ids:
        print(f"⚠️  Failed to fetch {len(missing_ids)} papers:")
        for missing_id in list(missing_ids)[:5]:
            print(f"   - {missing_id}")
        if len(missing_ids) > 5:
            print(f"   ... and {len(missing_ids) - 5} more")
    
    return all_results

def save_metadata_to_csv(papers_data: Dict[str, Any], collection_name: str) -> str:
    """
    Save paper metadata to CSV file
    
    Args:
        papers_data: Dictionary of paper details
        collection_name: Name of the collection
        
    Returns:
        Path to the created CSV file
    """
    collection_dir = Path(f"../data/collections/{collection_name}")
    collection_dir.mkdir(parents=True, exist_ok=True)
    
    csv_path = collection_dir / "arxiv_metadata.csv"
    
    # Define CSV fields
    fields = [
        'arxiv_id', 'title', 'abstract', 'authors', 'published_date', 
        'updated_date', 'categories', 'arxiv_url', 'pdf_url', 'doi', 
        'comment', 'journal_ref', 'fetched_at'
    ]
    
    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        
        for arxiv_id, paper_info in papers_data.items():
            # Convert authors list to string
            paper_info['authors'] = ' | '.join(paper_info['authors'])
            # Convert categories list to string
            paper_info['categories'] = ' | '.join(paper_info['categories'])
            
            writer.writerow(paper_info)
    
    print(f"💾 Saved metadata for {len(papers_data)} papers to: {csv_path}")
    return str(csv_path)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Extract arXiv IDs and fetch metadata')
    parser.add_argument('collection_name', help='Name of the collection directory')
    args = parser.parse_args()
    
    collection_name = args.collection_name
    
    print("🚀 arXiv Metadata Fetcher - Extract IDs and Fetch Metadata")
    print("=" * 60)
    print(f"📚 Collection: {collection_name}")
    
    # Extract arXiv IDs from PDFs
    arxiv_ids = extract_arxiv_ids_from_pdfs(collection_name)
    
    if not arxiv_ids:
        print("❌ No valid arXiv IDs found. Exiting.")
        sys.exit(1)
    
    # Fetch paper details from arXiv
    papers_data = fetch_all_paper_details(arxiv_ids)
    
    if not papers_data:
        print("❌ Failed to fetch any paper details. Exiting.")
        sys.exit(1)
    
    # Save metadata to CSV
    csv_path = save_metadata_to_csv(papers_data, collection_name)
    
    print("\n🎉 Completed successfully!")
    print(f"📄 Next step: Run arxiv_to_chromadb.py to load data into ChromaDB")
    print(f"📁 CSV file: {csv_path}")

if __name__ == "__main__":
    main()
