import os
import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from dataclasses import dataclass
from supabase import create_client, Client

logger = logging.getLogger(__name__)

@dataclass
class SupabaseSubscription:
    id: str
    email: str
    keywords: List[str]
    digest_time: str = "13:00"
    max_papers: int = 100
    summary_model: str = "llama-3.1-8b-instant-groq"
    tone: str = "concise"
    include_pdf_link: bool = True
    active: bool = True
    user_id: Optional[str] = None

class SupabaseClient:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.client: Client = create_client(url, key)
        logger.info("Supabase client initialized")
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            response = self.client.table('subscriptions').select("count").execute()
            logger.info("✅ Supabase connection successful")
            return True
        except Exception as e:
            logger.error(f"❌ Supabase connection failed: {e}")
            return False
    
    def get_active_subscriptions(self) -> List[SupabaseSubscription]:
        """Get all active subscriptions from database"""
        try:
            response = self.client.table('subscriptions').select("*").eq('active', True).execute()
            
            subscriptions = []
            for row in response.data:
                # Handle keywords as either JSONB array or text array
                keywords = row['keywords']
                if isinstance(keywords, str):
                    # If it's a JSON string, parse it
                    import json
                    try:
                        keywords = json.loads(keywords)
                    except:
                        keywords = [keywords]  # Fallback to single keyword
                elif not isinstance(keywords, list):
                    keywords = []
                
                subscription = SupabaseSubscription(
                    id=row['id'],
                    email=row['email'],
                    keywords=keywords,
                    digest_time=row.get('digest_time', '13:00'),
                    max_papers=row.get('max_papers', 100),
                    summary_model=row.get('summary_model', 'llama-3.1-8b-instant-groq'),
                    tone=row.get('tone', 'concise'),
                    include_pdf_link=row.get('include_pdf_link', True),
                    active=row.get('active', True),
                    user_id=row.get('user_id')
                )
                subscriptions.append(subscription)
            
            logger.info(f"📧 Loaded {len(subscriptions)} active subscriptions from Supabase")
            return subscriptions
            
        except Exception as e:
            logger.error(f"Failed to load subscriptions from Supabase: {e}")
            return []
    
    def save_papers(self, papers: List[Dict]) -> bool:
        """Save papers to database"""
        try:
            # Prepare papers for database insertion
            paper_data = []
            for paper in papers:
                # Match your existing schema - id is TEXT, authors/categories are JSONB
                paper_record = {
                    'id': paper['id'],  # TEXT primary key (arxiv ID)
                    'title': paper['title'],
                    'abstract': paper['abstract'],
                    'authors': paper['authors'],  # Already a list, will be stored as JSONB
                    'published': paper['published'],  # Note: column is 'published' not 'published_date'
                    'categories': paper['categories'],  # Already a list, will be stored as JSONB
                    'url': paper['url'],
                    'pdf_url': paper['pdf_url'],
                    'summary': paper.get('summary'),
                    'keywords_matched': paper.get('keywords_matched', []),
                    'detailed_analysis': paper.get('detailed_analysis'),
                    'analysis_generated_at': paper.get('analysis_generated_at'),
                    'analysis_model': paper.get('analysis_model')
                }
                
                # Add arxiv_id if the column exists
                paper_record['arxiv_id'] = paper['id']
                
                paper_data.append(paper_record)
            
            # Upsert papers (insert or update if exists)
            response = self.client.table('papers').upsert(
                paper_data, 
                on_conflict='id'  # Using id as the conflict column
            ).execute()
            
            logger.info(f"💾 Saved {len(paper_data)} papers to database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save papers to database: {e}")
            return False
    
    def save_digest_history(self, date: date, paper_ids: List[str]) -> bool:
        """Save daily digest history"""
        try:
            digest_record = {
                'date': date.isoformat(),
                'paper_count': len(paper_ids),
                'paper_ids': paper_ids,
                'generated_at': datetime.now().isoformat()
            }
            
            response = self.client.table('digest_history').upsert(
                [digest_record],
                on_conflict='date'
            ).execute()
            
            logger.info(f"📅 Saved digest history for {date}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save digest history: {e}")
            return False
    
    def save_user_digest(
        self,
        email: str,
        date: date,
        keywords: List[str],
        papers: List[Dict],
        sent_at: datetime,
        success: bool,
        error_message: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> bool:
        """Save user's personalized digest record"""
        try:
            digest_record = {
                'email': email,
                'date': date.isoformat(),
                'keywords': keywords,
                'paper_count': len(papers),
                'papers': papers,
                'sent_at': sent_at.isoformat(),
                'success': success,
                'error_message': error_message,
                'user_id': user_id
            }
            
            response = self.client.table('user_digests').insert([digest_record]).execute()
            
            status = "✅" if success else "❌"
            logger.info(f"{status} Saved user digest record for {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save user digest: {e}")
            return False
    
    def get_user_digest_history(self, email: str, limit: int = 30) -> List[Dict]:
        """Get user's digest history"""
        try:
            response = self.client.table('user_digests').select("*").eq('email', email).order('date', desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            logger.error(f"Failed to get user digest history: {e}")
            return []
    
    def generate_paper_analysis(self, paper_id: str) -> Dict:
        """Generate detailed analysis for a specific paper"""
        try:
            # Get paper from database
            result = self.client.table('papers').select('*').eq('id', paper_id).single().execute()
            
            if not result.data:
                logger.error(f"Paper {paper_id} not found in database")
                return {}
            
            paper = result.data
            
            # Check if analysis already exists
            if paper.get('detailed_analysis'):
                logger.info(f"Analysis already exists for paper {paper_id}")
                return paper['detailed_analysis']
            
            # Import paper analyzer
            from .paper_analyzer import generate_paper_analysis
            
            # Generate analysis
            analysis = generate_paper_analysis(
                title=paper['title'],
                abstract=paper['abstract'],
                authors=paper['authors'],
                categories=paper['categories']
            )
            
            # Save analysis back to database
            self.client.table('papers').update({
                'detailed_analysis': analysis,
                'analysis_generated_at': datetime.now().isoformat(),
                'analysis_model': 'llama-3.1-8b-instant-groq',
                'analysis_failed': False
            }).eq('id', paper_id).execute()
            
            logger.info(f"Generated and saved analysis for paper {paper_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to generate analysis for paper {paper_id}: {e}")
            
            # Mark analysis as failed
            try:
                self.client.table('papers').update({
                    'analysis_failed': True,
                    'analysis_generated_at': datetime.now().isoformat()
                }).eq('id', paper_id).execute()
            except:
                pass
            
            return {}
    
    def get_paper_with_analysis(self, paper_id: str) -> Optional[Dict]:
        """Get paper with detailed analysis from database"""
        try:
            result = self.client.table('papers').select('*').eq('id', paper_id).single().execute()
            
            if result.data:
                return result.data
            else:
                logger.warning(f"Paper {paper_id} not found in database")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get paper {paper_id}: {e}")
            return None