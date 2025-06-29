#!/usr/bin/env python3
"""
Test script to verify new keywords and paper limits
"""

import sys
import os
from dotenv import load_dotenv

sys.path.append('.')

from paperpulse.main import PaperPulseAgent
from paperpulse.supabase_client import SupabaseClient

def test_new_settings():
    """Test the updated settings"""
    load_dotenv()
    
    print("🧪 Testing new settings...")
    print("=" * 60)
    
    try:
        # Initialize agent
        agent = PaperPulseAgent()
        
        # Load subscribers
        subscribers = agent.load_subscribers()
        if not subscribers:
            print("❌ No subscribers found")
            return
        
        # Show current settings for the first subscriber
        sub = subscribers[0]
        print(f"📧 Subscriber: {sub.email}")
        print(f"📋 Keywords ({len(sub.keywords)}): {', '.join(sub.keywords)}")
        print(f"📄 Max papers: {sub.max_papers}")
        print(f"🤖 Model: {sub.summary_model}")
        
        # Test fetching papers with all keywords
        print(f"\n🔍 Testing paper fetch for all keywords...")
        all_keywords = list(set(kw for sub in subscribers for kw in sub.keywords))
        
        total_papers = 0
        for keyword in all_keywords:
            try:
                papers = agent.arxiv_client.search_papers(keyword, days_back=1)
                print(f"   {keyword}: {len(papers)} papers")
                total_papers += len(papers)
            except Exception as e:
                print(f"   {keyword}: ERROR - {e}")
        
        print(f"\n📚 Total papers found: {total_papers}")
        
        # Show expected papers per subscriber
        print(f"\n📊 Expected papers per subscriber:")
        for sub in subscribers:
            print(f"   {sub.email}: up to {sub.max_papers} papers")
        
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_new_settings() 