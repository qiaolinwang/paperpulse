import os
import json
import logging
from datetime import datetime, date
from typing import List, Dict
from pathlib import Path
from collections import defaultdict

import click
from dotenv import load_dotenv

from .arxiv_client import ArxivClient
from .summarizer import get_summarizer
from .email_sender import EmailSender
from .supabase_client import SupabaseClient, SupabaseSubscription
from .models import Paper, DigestResult

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PaperPulseAgent:
    def __init__(self):
        self.arxiv_client = ArxivClient(
            max_results=int(os.getenv("MAX_PAPERS_PER_KEYWORD", 50))
        )
        self.email_sender = EmailSender(
            api_key=os.getenv("SENDGRID_API_KEY"),
            from_email=os.getenv("FROM_EMAIL", "digest@paperpulse.ai"),
            from_name=os.getenv("FROM_NAME", "PaperPulse")
        )
        
        # Initialize Supabase client
        try:
            self.supabase = SupabaseClient()
            logger.info("✅ Supabase integration enabled")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase: {e}")
            logger.info("🔄 Falling back to JSON file mode")
            self.supabase = None
        
        # Keep JSON file support as fallback
        self.digest_output_dir = Path(os.getenv("DIGEST_OUTPUT_DIR", "../web/public/static/digests"))
        self.digest_output_dir.mkdir(parents=True, exist_ok=True)
    
    def load_subscribers(self) -> List[SupabaseSubscription]:
        """Load subscribers from Supabase or JSON file fallback"""
        if self.supabase:
            return self.supabase.get_active_subscriptions()
        else:
            # Fallback to JSON file
            return self._load_subscribers_from_json()
    
    def _load_subscribers_from_json(self) -> List[SupabaseSubscription]:
        """Fallback: Load subscribers from JSON file"""
        subscribers_file = os.getenv("SUBSCRIBERS_FILE", "subscribers.json")
        try:
            with open(subscribers_file, 'r') as f:
                data = json.load(f)
                
                subscribers = []
                for sub in data:
                    if sub.get("active", True):
                        subscription = SupabaseSubscription(
                            id=sub.get("id", "json-" + sub["email"]),
                            email=sub["email"],
                            keywords=sub["keywords"],
                            digest_time=sub.get("digest_time_utc", "13:00"),
                            max_papers=sub.get("max_papers", 20),
                            summary_model=sub.get("summary_model", "llama-3.1-8b-instant-groq"),
                            tone=sub.get("tone", "concise"),
                            include_pdf_link=sub.get("include_pdf_link", True),
                            active=sub.get("active", True)
                        )
                        subscribers.append(subscription)
                
                logger.info(f"📄 Loaded {len(subscribers)} subscribers from JSON file")
                return subscribers
                
        except FileNotFoundError:
            logger.warning(f"Subscribers file {subscribers_file} not found")
            return []
        except Exception as e:
            logger.error(f"Error loading subscribers from JSON: {e}")
            return []
    
    def fetch_papers_for_keywords(self, keywords: List[str]) -> Dict[str, List[Dict]]:
        """Fetch papers for given keywords"""
        papers_dict = defaultdict(list)
        
        for i, keyword in enumerate(keywords, 1):
            try:
                logger.info(f"📄 Fetching papers for keyword {i}/{len(keywords)}: '{keyword}'")
                papers = self.arxiv_client.search_papers(keyword, days_back=7)
                papers_dict[keyword] = papers
                logger.info(f"✅ Found {len(papers)} papers for '{keyword}'")
                
                # Add delay between requests to avoid rate limiting
                import time
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Failed to fetch papers for keyword '{keyword}': {e}")
                papers_dict[keyword] = []
        
        return dict(papers_dict)
    
    def summarize_papers(self, papers: List[Dict], model: str, tone: str) -> List[Dict]:
        """Add AI summaries to papers"""
        summarizer = get_summarizer(model)
        
        for paper in papers:
            try:
                summary = summarizer.summarize(
                    paper['title'],
                    paper['abstract'],
                    tone
                )
                paper['summary'] = summary
            except Exception as e:
                logger.error(f"Failed to summarize paper {paper['id']}: {e}")
                paper['summary'] = paper['abstract'][:200] + "..."
        
        return papers
    
    def process_subscriber(self, subscriber: SupabaseSubscription, available_papers: List[Dict] = None) -> DigestResult:
        """Process digest for a single subscriber"""
        try:
            logger.info(f"Processing subscriber: {subscriber.email}")
            
            # Use provided papers or fetch fresh ones if not provided
            if available_papers is not None:
                # Use the provided papers directly (they are already filtered by keywords in main search)
                all_papers = available_papers[:subscriber.max_papers]
            else:
                # Fallback: fetch papers directly (for backward compatibility)
                papers_dict = self.fetch_papers_for_keywords(subscriber.keywords)
                
                all_papers = []
                seen_ids = set()
                
                for keyword, papers in papers_dict.items():
                    for paper in papers:
                        if paper['id'] not in seen_ids:
                            seen_ids.add(paper['id'])
                            all_papers.append(paper)
                
                all_papers = all_papers[:subscriber.max_papers]
            
            if not all_papers:
                logger.info(f"No papers found for {subscriber.email}")
                return DigestResult(
                    subscriber_email=subscriber.email,
                    papers_count=0,
                    sent_at=datetime.now(),
                    success=True
                )
            
            all_papers = self.summarize_papers(
                all_papers, 
                subscriber.summary_model, 
                subscriber.tone
            )
            
            success = self.email_sender.send_digest(
                to_email=subscriber.email,
                papers=all_papers,
                keywords=subscriber.keywords,
                include_pdf_link=subscriber.include_pdf_link
            )
            
            # Save user's personalized digest to database
            if self.supabase:
                self.supabase.save_user_digest(
                    email=subscriber.email,
                    date=date.today(),
                    keywords=subscriber.keywords,
                    papers=all_papers,
                    sent_at=datetime.now(),
                    success=success,
                    user_id=subscriber.user_id
                )
            
            return DigestResult(
                subscriber_email=subscriber.email,
                papers_count=len(all_papers),
                sent_at=datetime.now(),
                success=success
            )
            
        except Exception as e:
            logger.error(f"Error processing subscriber {subscriber.email}: {e}")
            
            # Save failed digest record
            if self.supabase:
                self.supabase.save_user_digest(
                    email=subscriber.email,
                    date=date.today(),
                    keywords=subscriber.keywords,
                    papers=[],
                    sent_at=datetime.now(),
                    success=False,
                    error_message=str(e),
                    user_id=subscriber.user_id
                )
            
            return DigestResult(
                subscriber_email=subscriber.email,
                papers_count=0,
                sent_at=datetime.now(),
                success=False,
                error=str(e)
            )
    
    def save_daily_digest(self, papers: List[Dict]) -> bool:
        """Save today's digest to both Supabase and JSON file"""
        today = date.today()
        success = True
        
        # Save to Supabase if available
        if self.supabase:
            paper_ids = [paper['id'] for paper in papers]
            if not self.supabase.save_digest_history(today, paper_ids):
                success = False
            
            # Also save papers to database
            if not self.supabase.save_papers(papers):
                success = False
        
        # Always save JSON file for web display
        try:
            digest_file = self.digest_output_dir / f"{today.isoformat()}.json"
            
            with open(digest_file, 'w') as f:
                json.dump({
                    "date": today.isoformat(),
                    "papers": papers,
                    "generated_at": datetime.now().isoformat()
                }, f, indent=2)
            
            logger.info(f"Saved daily digest to {digest_file}")
        except Exception as e:
            logger.error(f"Failed to save JSON digest: {e}")
            success = False
        
        return success
    
    def run(self, dry_run: bool = False):
        """Main execution function"""
        logger.info("🚀 Starting PaperPulse agent run")
        
        # Test Supabase connection if available
        if self.supabase:
            if not self.supabase.test_connection():
                logger.warning("⚠️ Supabase connection failed, using JSON fallback")
                self.supabase = None
        
        subscribers = self.load_subscribers()
        if not subscribers:
            logger.warning("❌ No active subscribers found")
            return
        
        logger.info(f"📧 Processing {len(subscribers)} subscribers")
        
        # Get all unique keywords
        all_keywords = list(set(kw for sub in subscribers for kw in sub.keywords))
        logger.info(f"🔍 Fetching papers for keywords: {', '.join(all_keywords[:5])}{'...' if len(all_keywords) > 5 else ''}")
        
        try:
            papers_dict = self.fetch_papers_for_keywords(all_keywords)
        except Exception as e:
            logger.error(f"Failed to fetch papers: {e}")
            papers_dict = {}
        
        # Collect all unique papers
        all_papers = []
        seen_ids = set()
        for papers in papers_dict.values():
            for paper in papers:
                if paper['id'] not in seen_ids:
                    seen_ids.add(paper['id'])
                    all_papers.append(paper)
        
        logger.info(f"📚 Found {len(all_papers)} unique papers")
        
        # Save daily digest
        if not dry_run:
            self.save_daily_digest(all_papers[:50])
        
        # Process subscribers
        results = []
        for subscriber in subscribers:
            if dry_run:
                logger.info(f"[DRY RUN] Would process {subscriber.email}")
                continue
                
            result = self.process_subscriber(subscriber)
            results.append(result)
            logger.info(
                f"✅ Processed {subscriber.email}: "
                f"{result.papers_count} papers, "
                f"success={result.success}"
            )
        
        if not dry_run:
            successful = sum(1 for r in results if r.success)
            logger.info(
                f"🎉 Completed run: {successful}/{len(results)} "
                f"subscribers processed successfully"
            )
        else:
            logger.info(f"🧪 DRY RUN completed - would process {len(subscribers)} subscribers")

@click.command()
@click.option('--dry-run', is_flag=True, help='Test run without sending emails')
def main(dry_run: bool):
    """PaperPulse Agent - Daily paper digest generator"""
    agent = PaperPulseAgent()
    agent.run(dry_run=dry_run)

if __name__ == "__main__":
    main()