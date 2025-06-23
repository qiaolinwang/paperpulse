#!/usr/bin/env python3
"""Simple test to check if we can find ANY papers on arXiv"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from paperpulse.arxiv_client import ArxivClient

def test_basic_search():
    print("🧪 Testing basic arXiv search...")
    client = ArxivClient(max_results=10)
    
    # Test with very common terms that should always have papers
    test_keywords = [
        "deep learning",
        "neural network", 
        "transformer"
    ]
    
    for keyword in test_keywords:
        print(f"\n🔍 Testing: '{keyword}'")
        try:
            papers = client.search_papers(keyword, days_back=7)
            print(f"✅ Found {len(papers)} papers")
            
            if papers:
                print("📝 Sample papers:")
                for i, paper in enumerate(papers[:3], 1):
                    print(f"  {i}. {paper['title'][:60]}...")
            else:
                print("❌ No papers found - this might indicate an issue")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_basic_search()