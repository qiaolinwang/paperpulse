import feedparser
import httpx
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

class ArxivClient:
    BASE_URL = "https://export.arxiv.org/api/query"
    
    def __init__(self, max_results: int = 50):
        self.max_results = max_results
        self.client = httpx.Client(timeout=30.0)
    
    def search_papers(self, keyword: str, days_back: int = 3) -> List[Dict]:
        """Search arXiv for papers matching keyword in title OR abstract from the last N days"""
        try:
            # Use flexible search strategy for better results
            if keyword.lower() == "chain of thought":
                # More flexible search for reasoning papers
                search_query = f'(ti:"chain of thought" OR ti:"reasoning" OR ti:"step by step" OR abs:"chain of thought" OR abs:"reasoning" OR abs:"step-by-step")'
            elif keyword.lower() == "multimodal llm":
                # Search for vision-language and multimodal papers
                search_query = f'(ti:"multimodal" OR ti:"vision language" OR ti:"VLM" OR abs:"multimodal" OR abs:"vision-language" OR abs:"visual language")'
            elif keyword.lower() == "large language model":
                # Search for LLM papers with variations
                search_query = f'(ti:"language model" OR ti:"LLM" OR ti:"transformer" OR abs:"language model" OR abs:"LLM")'
            elif " " in keyword:
                # For other multi-word keywords, use both exact and flexible matching
                words = keyword.split()
                exact_search = f'ti:"{keyword}" OR abs:"{keyword}"'
                flexible_search = f'ti:{" AND ".join(words)} OR abs:{" AND ".join(words)}'
                search_query = f'({exact_search} OR {flexible_search})'
            else:
                search_query = f"ti:{keyword} OR abs:{keyword}"
            
            params = {
                "search_query": search_query,
                "max_results": self.max_results,
                "sortBy": "submittedDate",
                "sortOrder": "descending"
            }
            
            response = self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            
            feed = feedparser.parse(response.text)
            papers = []
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
            
            for entry in feed.entries:
                published = datetime.strptime(
                    entry.published, 
                    "%Y-%m-%dT%H:%M:%SZ"
                ).replace(tzinfo=timezone.utc)
                
                if published < cutoff_date:
                    continue
                
                paper = {
                    "id": entry.id.split("/")[-1],
                    "title": entry.title.replace("\n", " ").strip(),
                    "abstract": entry.summary.replace("\n", " ").strip(),
                    "authors": [author.name for author in entry.authors],
                    "published": published.isoformat(),
                    "url": entry.id,
                    "pdf_url": entry.id.replace("/abs/", "/pdf/") + ".pdf",
                    "categories": [tag.term for tag in entry.tags]
                }
                papers.append(paper)
            
            logger.info(f"Found {len(papers)} papers for keyword '{keyword}'")
            return papers
            
        except Exception as e:
            logger.error(f"Error fetching papers for keyword '{keyword}': {e}")
            return []
    
    def __del__(self):
        if hasattr(self, 'client'):
            self.client.close()