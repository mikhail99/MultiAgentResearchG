#!/usr/bin/env python3
"""
arXiv Search Tool - Search papers using arXiv API and arxivxplorer.com
This module provides multiple ways to search for arXiv papers:
1. Direct arXiv API search (most reliable)
2. Web scraping from arxivxplorer.com (fallback)
"""

import requests
from bs4 import BeautifulSoup
import re
import time
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse, quote
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ArXivScraper:
    """Web scraper for arxivxplorer.com"""

    def __init__(self):
        self.base_url = "https://arxivxplorer.com"
        self.session = requests.Session()
        # Set a reasonable user agent to avoid being blocked
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def search_papers(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search for papers using arXiv API first, fallback to web scraping

        Args:
            query: Search query string
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results and metadata
        """
        # Try direct arXiv API first
        arxiv_results = self._search_arxiv_api(query, max_results)

        if arxiv_results["success"] and arxiv_results["results"]:
            logger.info(f"✅ Found {len(arxiv_results['results'])} papers using arXiv API for query: {query}")
            return arxiv_results

        # Fallback to web scraping
        logger.info(f"🔄 arXiv API search failed or returned no results, trying web scraping...")
        return self._search_arxivxplorer_web(query, max_results)

    def _search_arxiv_api(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search using the official arXiv API

        Args:
            query: Search query string
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results and metadata
        """
        try:
            # Build arXiv API search URL
            # The arXiv API uses specific field codes and boolean operators
            search_query = f"ti:{query} OR abs:{query} OR au:{query}"

            api_url = f"http://export.arxiv.org/api/query?search_query={quote(search_query)}&start=0&max_results={max_results}&sortBy=relevance&sortOrder=descending"

            logger.info(f"🔍 Searching arXiv API for: {query}")
            logger.info(f"📄 API URL: {api_url}")

            # Make request to arXiv API
            response = self._make_request(api_url)
            if not response:
                return {
                    "success": False,
                    "error": "Failed to fetch from arXiv API",
                    "results": [],
                    "source": "arXiv API"
                }

            # Parse XML response
            papers = self._parse_arxiv_xml(response.text)

            logger.info(f"✅ Found {len(papers)} papers using arXiv API for query: {query}")

            return {
                "success": True,
                "query": query,
                "total_results": len(papers),
                "results": papers,
                "source": "arXiv API"
            }

        except Exception as e:
            logger.error(f"❌ Error searching arXiv API: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "source": "arXiv API"
            }

    def _parse_arxiv_xml(self, xml_content: str) -> List[Dict[str, Any]]:
        """
        Parse arXiv API XML response

        Args:
            xml_content: XML response from arXiv API

        Returns:
            List of paper dictionaries
        """
        papers = []

        try:
            # Parse XML
            root = ET.fromstring(xml_content)

            # Find all entry elements (each represents a paper)
            entries = root.findall('{http://www.w3.org/2005/Atom}entry')

            for entry in entries:
                try:
                    # Extract basic information
                    title_elem = entry.find('{http://www.w3.org/2005/Atom}title')
                    title = title_elem.text.strip() if title_elem is not None else ""

                    # Extract arXiv ID from the ID field
                    id_elem = entry.find('{http://www.w3.org/2005/Atom}id')
                    arxiv_id = ""
                    if id_elem is not None and id_elem.text:
                        # arXiv ID is in the format: http://arxiv.org/abs/{arxiv_id}v{version}
                        id_match = re.search(r'arxiv\.org/abs/([^v]+)', id_elem.text)
                        if id_match:
                            arxiv_id = id_match.group(1)

                    # Extract authors
                    authors = []
                    author_elems = entry.findall('{http://www.w3.org/2005/Atom}author')
                    for author_elem in author_elems:
                        name_elem = author_elem.find('{http://www.w3.org/2005/Atom}name')
                        if name_elem is not None and name_elem.text:
                            authors.append(name_elem.text.strip())

                    # Extract abstract
                    summary_elem = entry.find('{http://www.w3.org/2005/Atom}summary')
                    abstract = summary_elem.text.strip() if summary_elem is not None else ""

                    # Extract publication date
                    published_elem = entry.find('{http://www.w3.org/2005/Atom}published')
                    published_date = published_elem.text if published_elem is not None else ""

                    # Extract year from published date
                    year = ""
                    if published_date:
                        year_match = re.search(r'(\d{4})', published_date)
                        if year_match:
                            year = year_match.group(1)

                    # Extract categories/subjects
                    categories = []
                    category_elems = entry.findall('{http://www.w3.org/2005/Atom}category')
                    for cat_elem in category_elems:
                        term = cat_elem.get('term')
                        if term:
                            categories.append(term)

                    # Build paper dictionary
                    paper = {
                        "title": title,
                        "arxiv_id": arxiv_id,
                        "authors": authors,
                        "abstract": abstract,
                        "year": year,
                        "published_date": published_date,
                        "categories": categories,
                        "arxiv_url": f"https://arxiv.org/abs/{arxiv_id}",
                        "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}.pdf",
                        "source": "arXiv API"
                    }

                    papers.append(paper)

                except Exception as e:
                    logger.warning(f"⚠️ Error parsing individual paper entry: {str(e)}")
                    continue

            return papers

        except Exception as e:
            logger.error(f"❌ Error parsing arXiv XML: {str(e)}")
            return papers

    def _search_arxivxplorer_web(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search using web scraping from arxivxplorer.com

        Args:
            query: Search query string
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results and metadata
        """
        try:
            # Encode the query for URL
            encoded_query = quote(query)

            # Build search URL
            search_url = f"{self.base_url}/?q={encoded_query}"

            logger.info(f"🔍 Searching arxivxplorer.com for: {query}")
            logger.info(f"📄 Search URL: {search_url}")

            # Make request with retry logic
            response = self._make_request(search_url)
            if not response:
                return {
                    "success": False,
                    "error": "Failed to fetch search results from arxivxplorer.com",
                    "results": [],
                    "source": "arxivxplorer.com"
                }

            # Parse the search results
            papers = self._parse_search_results(response.text, max_results)

            logger.info(f"✅ Found {len(papers)} papers using web scraping for query: {query}")

            return {
                "success": True,
                "query": query,
                "total_results": len(papers),
                "results": papers,
                "source": "arxivxplorer.com"
            }

        except Exception as e:
            logger.error(f"❌ Error searching arxivxplorer.com: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "source": "arxivxplorer.com"
            }

    def _make_request(self, url: str, max_retries: int = 3) -> Optional[requests.Response]:
        """Make HTTP request with retry logic"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Request attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"❌ All request attempts failed for URL: {url}")
                    return None
        return None

    def _parse_search_results(self, html_content: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Parse search results from arxivxplorer.com HTML

        Args:
            html_content: Raw HTML content from search page
            max_results: Maximum number of results to parse

        Returns:
            List of paper dictionaries
        """
        papers = []
        soup = BeautifulSoup(html_content, 'html.parser')

        # Look for search result containers
        # The structure might vary, so we'll try multiple selectors
        result_selectors = [
            '.search-result',  # Common class name for search results
            '.result',         # Alternative class name
            '.paper',          # Paper-specific class
            '[data-testid="search-result"]',  # Modern React-style selectors
            '.result-item',    # Another common pattern
            'article',         # Generic article elements
        ]

        result_elements = []
        for selector in result_selectors:
            result_elements = soup.select(selector)
            if result_elements:
                logger.info(f"✅ Found {len(result_elements)} results using selector: {selector}")
                break

        if not result_elements:
            logger.warning("⚠️ No search result elements found - site structure may have changed")
            # Let's also try to debug by looking at all div elements
            all_divs = soup.find_all('div')
            logger.info(f"🔍 Found {len(all_divs)} total div elements")
            if all_divs:
                # Look at the first few divs to understand structure
                for i, div in enumerate(all_divs[:5]):
                    logger.info(f"Div {i}: class={div.get('class', 'None')}, id={div.get('id', 'None')}")

            # Try alternative parsing approach - look for any text that might contain arXiv information
            try:
                papers.extend(self._parse_search_results_fallback(soup, max_results))
            except Exception as e:
                logger.warning(f"⚠️ Fallback parsing also failed: {str(e)}")

            return papers

        # Process each result element
        for i, element in enumerate(result_elements):
            if i >= max_results:
                break

            try:
                paper = self._parse_single_result(element)
                if paper:
                    papers.append(paper)
            except Exception as e:
                logger.warning(f"⚠️ Failed to parse result {i + 1}: {str(e)}")
                continue

        return papers

    def _parse_search_results_fallback(self, soup: BeautifulSoup, max_results: int) -> List[Dict[str, Any]]:
        """
        Fallback method to parse search results when standard selectors fail
        """
        papers = []

        # Try to find any text that looks like paper titles or arXiv IDs
        text_content = soup.get_text()

        # Look for arXiv IDs in the text
        arxiv_pattern = r'(\d{4}\.\d{4,5})'
        found_ids = re.findall(arxiv_pattern, text_content)

        # Look for potential paper titles (lines that are reasonably long but not too long)
        lines = text_content.split('\n')
        potential_titles = []

        for line in lines:
            line = line.strip()
            # Skip very short lines or very long lines (likely not titles)
            if 20 < len(line) < 200 and not line.startswith('http') and not any(char.isdigit() and len(char) > 4 for char in line.split()):
                potential_titles.append(line)

        # Try to create papers from found information
        for i, title in enumerate(potential_titles[:max_results]):
            # Check if this title is associated with any of the found arXiv IDs
            arxiv_id = ""
            for fid in found_ids:
                if fid in title:
                    arxiv_id = fid
                    break

            if title and not arxiv_id:
                # If no arXiv ID found in title, try to find one nearby
                # This is a simple heuristic - in practice, the site structure would be more complex
                pass

            if title:
                papers.append({
                    "title": title,
                    "arxiv_id": arxiv_id,
                    "arxiv_url": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "",
                    "abstract": "No abstract available from fallback parsing",
                    "authors": [],
                    "year": "",
                    "source": "arxivxplorer.com (fallback)"
                })

        logger.info(f"🔍 Fallback parsing found {len(papers)} potential papers")
        return papers

    def _parse_single_result(self, element) -> Optional[Dict[str, Any]]:
        """
        Parse a single search result element

        Args:
            element: BeautifulSoup element containing paper information

        Returns:
            Paper dictionary or None if parsing fails
        """
        try:
            # Try to extract title
            title_element = element.find(['h1', 'h2', 'h3', 'h4', 'a'])
            title = ""
            arxiv_url = ""

            if title_element:
                # Get title text
                title = title_element.get_text(strip=True)

                # Try to get arXiv URL from href
                if title_element.name == 'a' and title_element.get('href'):
                    href = title_element.get('href')
                    if href.startswith('http'):
                        arxiv_url = href
                    else:
                        arxiv_url = urljoin(self.base_url, href)

                # If title element doesn't have href, look for link within the element
                elif element.find('a'):
                    link_element = element.find('a')
                    href = link_element.get('href')
                    if href and href.startswith('http'):
                        arxiv_url = href
                    elif href:
                        arxiv_url = urljoin(self.base_url, href)

            # Try to extract abstract/snippet
            abstract = ""
            snippet_selectors = ['p', '.snippet', '.abstract', '.description', '[data-testid="snippet"]']

            for selector in snippet_selectors:
                snippet_element = element.find(selector)
                if snippet_element:
                    abstract = snippet_element.get_text(strip=True)
                    break

            # If no abstract found, try to get content from the element
            if not abstract:
                abstract = element.get_text(strip=True)
                # Remove title from abstract if it's included
                if title and title in abstract:
                    abstract = abstract.replace(title, '').strip()

            # Try to extract arXiv ID
            arxiv_id = ""
            if arxiv_url:
                # Extract arXiv ID from URL
                arxiv_id = self._extract_arxiv_id_from_url(arxiv_url)

            # If no arXiv ID found in URL, look for it in text content
            if not arxiv_id:
                text_content = element.get_text()
                arxiv_id = self._extract_arxiv_id_from_text(text_content)

            # Extract publication year if available
            year = ""
            year_patterns = [
                r'(\d{4})',  # 4-digit year
                r'(\d{2})',  # 2-digit year (less reliable)
            ]

            for pattern in year_patterns:
                match = re.search(pattern, element.get_text())
                if match and len(match.group(1)) == 4:
                    year = match.group(1)
                    break

            # Extract authors if available
            authors = []
            author_selectors = ['.authors', '.author', '[data-testid="authors"]', '.byline']

            for selector in author_selectors:
                author_element = element.find(selector)
                if author_element:
                    authors_text = author_element.get_text(strip=True)
                    if authors_text:
                        # Split by common delimiters
                        authors = [author.strip() for author in re.split(r'[,&;]', authors_text) if author.strip()]
                    break

            # Only return papers that have at least a title
            if not title:
                return None

            return {
                "title": title,
                "arxiv_id": arxiv_id,
                "arxiv_url": arxiv_url,
                "abstract": abstract[:500] + "..." if len(abstract) > 500 else abstract,  # Truncate long abstracts
                "authors": authors[:3] if authors else [],  # Limit to first 3 authors
                "year": year,
                "source": "arxivxplorer.com"
            }

        except Exception as e:
            logger.error(f"❌ Error parsing single result: {str(e)}")
            return None

    def _extract_arxiv_id_from_url(self, url: str) -> str:
        """
        Extract arXiv ID from URL

        Args:
            url: URL to extract ID from

        Returns:
            arXiv ID string or empty string
        """
        patterns = [
            r'arxiv\.org/abs/(\d{4}\.\d{4,5})',  # Standard arXiv abs URL
            r'arxiv\.org/pdf/(\d{4}\.\d{4,5})',  # PDF URL
            r'arxiv\.org/.*(\d{4}\.\d{4,5})',    # General arXiv URL
        ]

        for pattern in patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return match.group(1)

        return ""

    def _extract_arxiv_id_from_text(self, text: str) -> str:
        """
        Extract arXiv ID from text content

        Args:
            text: Text content to search

        Returns:
            arXiv ID string or empty string
        """
        # Look for patterns like "arXiv:2101.12345" or just "2101.12345"
        patterns = [
            r'arXiv[:\s]*(\d{4}\.\d{4,5})',
            r'(\d{4}\.\d{4,5})',  # Just the ID pattern
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        return ""

    def get_paper_details(self, arxiv_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific paper

        Args:
            arxiv_id: arXiv ID of the paper

        Returns:
            Paper details dictionary or None if not found
        """
        try:
            # Try to construct URL for the specific paper
            paper_url = f"https://arxiv.org/abs/{arxiv_id}"

            logger.info(f"📄 Fetching details for arXiv ID: {arxiv_id}")

            response = self._make_request(paper_url)
            if not response:
                return None

            # Parse the arXiv abstract page
            return self._parse_arxiv_abstract_page(response.text, arxiv_id)

        except Exception as e:
            logger.error(f"❌ Error fetching paper details for {arxiv_id}: {str(e)}")
            return None

    def _parse_arxiv_abstract_page(self, html_content: str, arxiv_id: str) -> Optional[Dict[str, Any]]:
        """
        Parse arXiv abstract page for detailed paper information

        Args:
            html_content: HTML content from arXiv abstract page
            arxiv_id: Expected arXiv ID

        Returns:
            Paper details dictionary
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # Extract title
            title_element = soup.find('h1', {'class': 'title'})
            title = title_element.get_text(strip=True) if title_element else ""

            # Extract authors
            authors = []
            authors_elements = soup.find_all('a', {'href': lambda x: x and '/search/cs?searchtype=author' in str(x)})
            for author_element in authors_elements:
                authors.append(author_element.get_text(strip=True))

            # Extract abstract
            abstract_element = soup.find('blockquote', {'class': 'abstract'})
            abstract = abstract_element.get_text(strip=True) if abstract_element else ""

            # Extract submission date and other metadata
            submission_info = soup.find('div', {'class': 'submission-history'})
            submitted_date = ""
            if submission_info:
                date_match = re.search(r'(\w+ \d{1,2}, \d{4})', submission_info.get_text())
                if date_match:
                    submitted_date = date_match.group(1)

            # Extract subjects/categories
            subjects = []
            subject_elements = soup.find_all('span', {'class': 'primary-subject'})
            for subject_element in subject_elements:
                subjects.append(subject_element.get_text(strip=True))

            return {
                "title": title,
                "arxiv_id": arxiv_id,
                "authors": authors,
                "abstract": abstract,
                "submitted_date": submitted_date,
                "subjects": subjects,
                "arxiv_url": f"https://arxiv.org/abs/{arxiv_id}",
                "pdf_url": f"https://arxiv.org/pdf/{arxiv_id}.pdf",
                "source": "arxiv.org"
            }

        except Exception as e:
            logger.error(f"❌ Error parsing arXiv abstract page: {str(e)}")
            return None


def search_arxiv_papers(query: str, max_results: int = 10) -> str:
    """
    Convenience function to search arXiv papers and return formatted results

    Args:
        query: Search query
        max_results: Maximum number of results

    Returns:
        Formatted string with search results
    """
    scraper = ArXivScraper()
    results = scraper.search_papers(query, max_results)

    if not results["success"]:
        return f"❌ Search failed: {results['error']}"

    if not results["results"]:
        return f"📄 No papers found for query: '{query}'"

    # Format results for display
    formatted_output = f"# arXiv Papers Search Results\n\n"
    formatted_output += f"**Query:** {query}\n"
    formatted_output += f"**Found:** {results['total_results']} papers\n"
    formatted_output += f"**Source:** {results['source']}\n\n"

    for i, paper in enumerate(results["results"], 1):
        formatted_output += f"## {i}. {paper['title']}\n"

        if paper['arxiv_id']:
            formatted_output += f"**arXiv ID:** {paper['arxiv_id']}\n"

        if paper['authors']:
            formatted_output += f"**Authors:** {', '.join(paper['authors'])}\n"

        if paper['year']:
            formatted_output += f"**Year:** {paper['year']}\n"

        if paper['arxiv_url']:
            formatted_output += f"**URL:** {paper['arxiv_url']}\n"

        if paper['abstract']:
            formatted_output += f"**Abstract:** {paper['abstract']}\n"

        formatted_output += "\n---\n\n"

    return formatted_output


if __name__ == "__main__":
    # Test the scraper
    test_query = "modeling transfer function for image sensor"
    results = search_arxiv_papers(test_query, max_results=3)

    print("🧪 Testing arXiv Scraper")
    print("=" * 50)
    print(results)
