#!/usr/bin/env python3
"""
Update subscription settings for a user
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def update_subscription():
    # Initialize Supabase client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return
    
    client = create_client(url, key)
    
    # Update subscription for qw2443@columbia.edu
    email = "qw2443@columbia.edu"
    
    # New keywords including the additions
    new_keywords = [
        "Chain of Thought",
        "large language model",
        "emotion recognition",
        "text to speech",
        "speech synthesis",
        "Audio LLM"
    ]
    
    try:
        # Update the subscription
        response = client.table('subscriptions').update({
            'keywords': new_keywords,
            'max_papers': 100  # Increased from default 20 to 100
        }).eq('email', email).execute()
        
        if response.data:
            print(f"✅ Successfully updated subscription for {email}")
            print(f"📋 New keywords: {', '.join(new_keywords)}")
            print(f"📄 Max papers: 100")
        else:
            print(f"❌ No subscription found for {email}")
            
    except Exception as e:
        print(f"❌ Error updating subscription: {e}")

if __name__ == "__main__":
    update_subscription() 