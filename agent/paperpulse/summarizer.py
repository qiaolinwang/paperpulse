from typing import Dict, Optional
import os
import time
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class BaseSummarizer(ABC):
    @abstractmethod
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        pass

class OpenAISummarizer(BaseSummarizer):
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        self.api_key = api_key
        self.model = model
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            prompt = f"""Summarize this research paper in {tone} language (max 120 words):
Title: {title}
Abstract: {abstract}

Focus on: What problem it solves, the approach, and key findings."""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class GroqSummarizer(BaseSummarizer):
    """Free tier: 14,400 requests/day with Llama models"""
    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant", rate_limit_delay: float = 0.5):
        self.api_key = api_key
        self.model = model
        self.rate_limit_delay = rate_limit_delay  # Delay between requests
        self.last_request_time = 0
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            # Rate limiting: ensure minimum delay between requests
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.rate_limit_delay:
                sleep_time = self.rate_limit_delay - time_since_last
                logger.info(f"Rate limiting: sleeping {sleep_time:.2f}s")
                time.sleep(sleep_time)
            
            from groq import Groq
            client = Groq(api_key=self.api_key)
            
            prompt = f"""Summarize this research paper in {tone} language (max 120 words):
Title: {title}
Abstract: {abstract}

Focus on: What problem it solves, the approach, and key findings."""
            
            self.last_request_time = time.time()
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Groq summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class HuggingFaceSummarizer(BaseSummarizer):
    """Completely free local summarization"""
    def __init__(self, model: str = "facebook/bart-large-cnn"):
        self.model_name = model
        self.summarizer = None
        
    def _load_model(self):
        if self.summarizer is None:
            try:
                from transformers import pipeline
                self.summarizer = pipeline("summarization", model=self.model_name)
                logger.info(f"Loaded HuggingFace model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to load HuggingFace model: {e}")
                raise
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            self._load_model()
            
            # Combine title and abstract for summarization
            text = f"Title: {title}\n\nAbstract: {abstract}"
            
            # BART has a max input length, so truncate if needed
            if len(text) > 1024:
                text = text[:1024]
            
            result = self.summarizer(text, max_length=120, min_length=30, do_sample=False)
            summary = result[0]['summary_text']
            
            # Add tone adjustment (simple approach)
            if tone == "accessible":
                summary = f"In simple terms: {summary}"
            elif tone == "technical":
                summary = f"Technical summary: {summary}"
            
            return summary.strip()
            
        except Exception as e:
            logger.error(f"HuggingFace summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class OllamaSummarizer(BaseSummarizer):
    """Free local models via Ollama server"""
    def __init__(self, model: str = "llama3.2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            import requests
            
            prompt = f"""Summarize this research paper in {tone} language (max 120 words):
Title: {title}
Abstract: {abstract}

Focus on: What problem it solves, the approach, and key findings."""
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 150
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["response"].strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Ollama summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class TogetherAISummarizer(BaseSummarizer):
    """Free tier: $5 credit on signup"""
    def __init__(self, api_key: str, model: str = "meta-llama/Llama-3.2-3B-Instruct-Turbo"):
        self.api_key = api_key
        self.model = model
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            import requests
            
            prompt = f"""Summarize this research paper in {tone} language (max 120 words):
Title: {title}
Abstract: {abstract}

Focus on: What problem it solves, the approach, and key findings."""
            
            response = requests.post(
                "https://api.together.xyz/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            else:
                raise Exception(f"Together AI error: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Together AI summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class AnthropicSummarizer(BaseSummarizer):
    def __init__(self, api_key: str, model: str = "claude-3-haiku-20240307"):
        self.api_key = api_key
        self.model = model
        
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)
            
            prompt = f"""Summarize this research paper in {tone} language (max 120 words):
Title: {title}
Abstract: {abstract}

Focus on: What problem it solves, the approach, and key findings."""
            
            response = client.messages.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150
            )
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.error(f"Anthropic summarization error: {e}")
            return f"Summary unavailable. Title: {title[:100]}..."

class MockSummarizer(BaseSummarizer):
    """For testing without API calls"""
    def summarize(self, title: str, abstract: str, tone: str = "concise") -> str:
        return f"[Mock Summary] This paper titled '{title[:50]}...' presents novel research. The approach is innovative and results are promising."

def get_summarizer(model: str, api_key: Optional[str] = None) -> BaseSummarizer:
    """Factory function to get appropriate summarizer"""
    
    # OpenAI models (free tier available)
    if model.startswith("gpt"):
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        return OpenAISummarizer(api_key, model)
    
    # Groq models (free tier: 14,400 requests/day)
    elif model.startswith("llama") and "groq" in model.lower():
        if not api_key:
            api_key = os.getenv("GROQ_API_KEY")
        # Extract rate limit delay if specified (e.g., "llama-3.1-8b-instant-groq-slow")
        delay = 1.0 if "slow" in model.lower() else 0.5
        return GroqSummarizer(api_key, model.replace("-groq", "").replace("-slow", ""), delay)
    
    # HuggingFace local models (completely free)
    elif model.startswith("hf-"):
        model_name = model.replace("hf-", "")
        return HuggingFaceSummarizer(model_name)
    
    # Ollama local models (free)
    elif model.startswith("ollama-"):
        model_name = model.replace("ollama-", "")
        return OllamaSummarizer(model_name)
    
    # Together AI models (free tier: $5 credit)
    elif model.startswith("together-"):
        if not api_key:
            api_key = os.getenv("TOGETHER_API_KEY")
        model_name = model.replace("together-", "")
        return TogetherAISummarizer(api_key, model_name)
    
    # Anthropic models
    elif model.startswith("claude"):
        if not api_key:
            api_key = os.getenv("ANTHROPIC_API_KEY")
        return AnthropicSummarizer(api_key, model)
    
    # Default fallback
    else:
        return MockSummarizer()