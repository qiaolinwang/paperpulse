#!/usr/bin/env python3
"""Test script to verify arXiv search improvements"""

import sys
import os
sys.path.append('/home/venti/paperpulse/agent')

from paperpulse.arxiv_client import ArxivClient

def test_search():
    client = ArxivClient(max_results=5)
    
    keywords = [
        "machine learning",
        "deep learning", 
        "neural networks",
        "transformer",
        "AI"
    ]
    
    for keyword in keywords:
        print(f"\n🔍 Testing keyword: '{keyword}'")
        print("=" * 50)
        
        papers = client.search_papers(keyword, days_back=7)
        print(f"Found {len(papers)} papers")
        
        for i, paper in enumerate(papers[:3], 1):
            print(f"{i}. {paper['title'][:80]}...")
            print(f"   Published: {paper['published'][:10]}")

if __name__ == "__main__":
    test_search()