#!/usr/bin/env python3
"""
Test script for PaperPulse summarization providers
"""
import os
from paperpulse.summarizer import get_summarizer

def test_summarizer(model_name, api_key=None):
    """Test a summarization model"""
    print(f"\n🧪 Testing {model_name}...")
    
    try:
        summarizer = get_summarizer(model_name, api_key)
        
        # Test paper
        title = "Attention Is All You Need: Transformer Architecture for NLP"
        abstract = """We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU."""
        
        summary = summarizer.summarize(title, abstract, "concise")
        
        print(f"✅ SUCCESS!")
        print(f"📝 Summary: {summary}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("🎯 PaperPulse Summarizer Tester")
    print("=" * 50)
    
    # Check environment variables
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY") 
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    
    print("\n🔑 API Keys Found:")
    print(f"  Groq: {'✅' if groq_key else '❌'}")
    print(f"  OpenAI: {'✅' if openai_key else '❌'}")
    print(f"  Anthropic: {'✅' if anthropic_key else '❌'}")
    
    # Test available providers
    success_count = 0
    
    if groq_key:
        if test_summarizer("llama-3.1-8b-instant-groq"):
            success_count += 1
    
    if openai_key:
        if test_summarizer("gpt-3.5-turbo"):
            success_count += 1
            
    if anthropic_key:
        if test_summarizer("claude-3-haiku-20240307"):
            success_count += 1
    
    if success_count == 0:
        print("\n⚠️  No working summarizers found!")
        print("\n📖 Setup Instructions:")
        print("1. Get an API key from one of these providers:")
        print("   - Groq (recommended): https://console.groq.com")
        print("   - OpenAI: https://platform.openai.com") 
        print("   - Anthropic: https://console.anthropic.com")
        print("\n2. Set environment variable:")
        print("   export GROQ_API_KEY='your_key_here'")
        print("   # or")
        print("   export OPENAI_API_KEY='your_key_here'")
        print("   # or") 
        print("   export ANTHROPIC_API_KEY='your_key_here'")
        print("\n3. Run this script again: python test_summarizer.py")
    else:
        print(f"\n🎉 {success_count} summarizer(s) working!")
        print("\n✅ You're ready to run PaperPulse with summarization!")

if __name__ == "__main__":
    main() 