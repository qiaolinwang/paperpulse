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
            # Improve search strategy for better results
            if " " in keyword:
                # For multi-word keywords, use quotes for exact phrase matching
                search_query = f'ti:"{keyword}" OR abs:"{keyword}"'
            elif keyword.lower() == "ai":
                # "AI" is too generic, search for more specific AI terms
                search_query = f'(ti:"artificial intelligence" OR abs:"artificial intelligence" OR ti:"AI model" OR abs:"AI model" OR ti:"AI system" OR abs:"AI system")'
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