"""
Supabase client for PaperPulse Agent
Handles database operations for subscriptions, papers, and digests
"""

import os
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime, date
from dataclasses import dataclass
from supabase import create_client, Client

logger = logging.getLogger(__name__)

@dataclass
class SupabaseSubscription:
    id: str
    email: str
    keywords: List[str]
    digest_time: str
    max_papers: int
    summary_model: str
    tone: str
    include_pdf_link: bool
    active: bool
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.url or not self.service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required")
        
        try:
            self.client: Client = create_client(self.url, self.service_key)
            logger.info("✅ Supabase client initialized")
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
            raise
    
    def get_active_subscriptions(self) -> List[SupabaseSubscription]:
        """Get all active subscriptions from Supabase"""
        try:
            response = self.client.table('subscriptions').select('*').eq('active', True).execute()
            
            subscriptions = []
            for row in response.data:
                subscription = SupabaseSubscription(
                    id=row['id'],
                    email=row['email'] or '',  # Handle NULL emails for user-based subscriptions
                    keywords=row['keywords'] if isinstance(row['keywords'], list) else [],
                    digest_time=row['digest_time'],
                    max_papers=row['max_papers'],
                    summary_model=row['summary_model'],
                    tone=row['tone'],
                    include_pdf_link=row['include_pdf_link'],
                    active=row['active'],
                    user_id=row.get('user_id'),
                    created_at=row.get('created_at'),
                    updated_at=row.get('updated_at')
                )
                
                # For user-based subscriptions, get email from users table
                if subscription.user_id and not subscription.email:
                    user_response = self.client.table('users').select('email').eq('id', subscription.user_id).single().execute()
                    if user_response.data:
                        subscription.email = user_response.data['email']
                
                if subscription.email:  # Only include subscriptions with valid email
                    subscriptions.append(subscription)
            
            logger.info(f"📧 Found {len(subscriptions)} active subscriptions")
            return subscriptions
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch subscriptions: {e}")
            return []
    
    def save_papers(self, papers: List[Dict]) -> bool:
        """Save papers to Supabase"""
        try:
            # Prepare papers for database insertion
            db_papers = []
            for paper in papers:
                db_paper = {
                    'id': paper['id'],
                    'title': paper['title'],
                    'abstract': paper['abstract'],
                    'authors': paper['authors'],
                    'published': paper['published'],
                    'url': paper['url'],
                    'pdf_url': paper['pdf_url'],
                    'categories': paper.get('categories', []),
                    'summary': paper.get('summary'),
                }
                db_papers.append(db_paper)
            
            # Use upsert to handle duplicates
            response = self.client.table('papers').upsert(db_papers).execute()
            
            logger.info(f"💾 Saved {len(db_papers)} papers to database")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save papers: {e}")
            return False
    
    def save_digest_history(self, date: date, paper_ids: List[str]) -> bool:
        """Save daily digest history"""
        try:
            digest_data = {
                'date': date.isoformat(),
                'papers': paper_ids
            }
            
            response = self.client.table('digest_history').upsert([digest_data]).execute()
            
            logger.info(f"📅 Saved digest history for {date}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save digest history: {e}")
            return False
    
    def get_digest_history(self, date: date) -> Optional[Dict]:
        """Get digest history for a specific date"""
        try:
            response = self.client.table('digest_history').select('*').eq('date', date.isoformat()).single().execute()
            
            if response.data:
                return response.data
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get digest history for {date}: {e}")
            return None
    
    def update_subscription_status(self, subscription_id: str, active: bool) -> bool:
        """Update subscription active status"""
        try:
            response = self.client.table('subscriptions').update({'active': active}).eq('id', subscription_id).execute()
            
            logger.info(f"📝 Updated subscription {subscription_id} status to {active}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update subscription status: {e}")
            return False
    
    def test_connection(self) -> bool:
        """Test Supabase connection"""
        try:
            # Simple query to test connection
            response = self.client.table('subscriptions').select('count').execute()
            logger.info("✅ Supabase connection test successful")
            return True
            
        except Exception as e:
            logger.error(f"❌ Supabase connection test failed: {e}")
            return False
    
    def save_user_digest(self, email: str, date: date, keywords: List[str], 
                        papers: List[Dict], sent_at: datetime, success: bool, 
                        error_message: str = None, user_id: str = None) -> bool:
        """Save user's personalized digest history"""
        try:
            paper_ids = [paper['id'] for paper in papers]
            
            digest_data = {
                'user_id': user_id,
                'email': email,
                'date': date.isoformat(),
                'keywords': keywords,
                'papers': paper_ids,
                'papers_count': len(papers),
                'sent_at': sent_at.isoformat(),
                'success': success,
                'error_message': error_message
            }
            
            # Use upsert to handle duplicates (same email + date)
            response = self.client.table('user_digests').upsert([digest_data]).execute()
            
            logger.info(f"💾 Saved user digest for {email}: {len(papers)} papers")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save user digest for {email}: {e}")
            return False
    
    def get_user_digest_history(self, email: str, days: int = 7) -> List[Dict]:
        """Get user's digest history for the last N days"""
        try:
            from datetime import timedelta
            start_date = (date.today() - timedelta(days=days)).isoformat()
            
            response = self.client.table('user_digests').select('*').eq('email', email).gte('date', start_date).order('date', desc=True).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"❌ Failed to get user digest history for {email}: {e}")
            return []
    
    def get_user_papers_for_date(self, email: str, target_date: date) -> List[str]:
        """Get paper IDs that were sent to a specific user on a specific date"""
        try:
            response = self.client.table('user_digests').select('papers').eq('email', email).eq('date', target_date.isoformat()).single().execute()
            
            if response.data:
                return response.data.get('papers', [])
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get user papers for {email} on {target_date}: {e}")
            return [] 