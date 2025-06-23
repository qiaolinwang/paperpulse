# Free Summarization Setup Guide

PaperPulse now supports multiple **FREE** summarization providers! Here are your options, ranked by ease of setup:

## 🚀 Quick Start Options

### 1. **Groq** (Recommended - Fastest & Easiest)
- ✅ **FREE**: 14,400 requests/day (more than enough for daily digests)
- ✅ **Fast**: Lightning-fast Llama models
- ✅ **Easy setup**: Just need an API key

**Setup:**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free account
3. Get your API key
4. Set environment variable:
   ```bash
   export GROQ_API_KEY="your_groq_api_key_here"
   ```

**Usage in PaperPulse:**
```json
{
  "email": "user@example.com",
  "keywords": ["AI", "machine learning"],
  "summary_model": "llama-3.1-8b-instant-groq",
  "tone": "concise"
}
```

### 2. **OpenAI Free Tier**
- ✅ **FREE**: $5 credit on signup (lasts months for summarization)
- ✅ **High quality**: GPT-3.5-turbo or GPT-4o-mini
- ✅ **Reliable**: Industry standard

**Setup:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up and get $5 free credit
3. Get your API key
4. Set environment variable:
   ```bash
   export OPENAI_API_KEY="your_openai_api_key_here"
   ```

**Usage:**
```json
{
  "summary_model": "gpt-3.5-turbo",
  "tone": "accessible"
}
```

### 3. **Together AI**
- ✅ **FREE**: $5 credit on signup
- ✅ **Open source models**: Llama, Mistral, etc.
- ✅ **Good performance**: Fast and reliable

**Setup:**
1. Go to [api.together.xyz](https://api.together.xyz)
2. Sign up for free account and get $5 credit
3. Get your API key
4. Set environment variable:
   ```bash
   export TOGETHER_API_KEY="your_together_api_key_here"
   ```

**Usage:**
```json
{
  "summary_model": "together-meta-llama/Llama-3.2-3B-Instruct-Turbo",
  "tone": "technical"
}
```

## 🖥️ Local Options (100% Free Forever)

### 4. **HuggingFace Transformers** (Completely Free)
- ✅ **100% FREE**: No API keys, runs locally
- ✅ **Private**: No data sent to external services
- ❌ **Slower**: Downloads model first time (~1GB)
- ❌ **Resource intensive**: Needs decent CPU/GPU

**Setup:**
```bash
# Install dependencies
pip install transformers torch sentencepiece

# First run downloads the model (one-time)
```

**Usage:**
```json
{
  "summary_model": "hf-facebook/bart-large-cnn",
  "tone": "concise"
}
```

**Alternative models:**
- `hf-facebook/bart-large-cnn` (recommended for summarization)
- `hf-google/pegasus-xsum` (newspaper-style summaries)
- `hf-microsoft/DialoGPT-medium` (conversational style)

### 5. **Ollama** (100% Free Local LLMs)
- ✅ **100% FREE**: Runs locally
- ✅ **Private**: No external API calls
- ✅ **Powerful**: Access to Llama, Mistral, etc.
- ❌ **Setup required**: Need to install Ollama server

**Setup:**
1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Pull a model:
   ```bash
   ollama pull llama3.2
   # or
   ollama pull mistral
   ```
3. Start Ollama server (usually automatic)

**Usage:**
```json
{
  "summary_model": "ollama-llama3.2",
  "tone": "accessible"
}
```

## 📝 Testing Your Setup

After setting up any provider, test it:

```bash
# Navigate to agent directory
cd agent

# Test with your chosen model
python -c "
from paperpulse.summarizer import get_summarizer
summarizer = get_summarizer('llama-3.1-8b-instant-groq')  # or your chosen model
result = summarizer.summarize(
    'Test Paper: Novel AI Approach',
    'This paper presents a new method for AI that improves performance significantly.',
    'concise'
)
print('Summary:', result)
"
```

## 🔧 Environment Variables

Create a `.env` file in your agent directory:

```bash
# Choose ONE or more providers:

# Groq (recommended)
GROQ_API_KEY=your_groq_key_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Together AI
TOGETHER_API_KEY=your_together_key_here

# No setup needed for HuggingFace or Ollama
```

## 📊 Comparison Table

| Provider | Cost | Speed | Quality | Setup Difficulty | Internet Required |
|----------|------|-------|---------|------------------|-------------------|
| **Groq** | FREE (14.4k/day) | ⚡⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Easy | Yes |
| **OpenAI** | FREE ($5 credit) | ⚡⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Easy | Yes |
| **Together AI** | FREE ($5 credit) | ⚡⚡⚡ | ⭐⭐⭐⭐ | Easy | Yes |
| **HuggingFace** | 100% FREE | ⚡⚡ | ⭐⭐⭐ | Medium | No |
| **Ollama** | 100% FREE | ⚡⚡⚡ | ⭐⭐⭐⭐ | Hard | No |

## 🎯 Recommendations

- **For most users**: Start with **Groq** - it's fast, free, and easy
- **For highest quality**: Use **OpenAI** with your free credits
- **For privacy**: Use **HuggingFace** or **Ollama** (local processing)
- **For production**: **Groq** or **Together AI** (generous free tiers)

## 🔄 Updating Your Subscriber Settings

Update your `subscribers.json` file to use your chosen model:

```json
[
  {
    "email": "your-email@example.com",
    "keywords": ["AI", "machine learning"],
    "summary_model": "llama-3.1-8b-instant-groq",
    "tone": "concise",
    "max_papers": 20,
    "include_pdf_link": true,
    "active": true
  }
]
```

## 🚨 Troubleshooting

### Common Issues:

1. **"Module not found" errors**:
   ```bash
   pip install groq  # for Groq
   pip install transformers torch  # for HuggingFace
   ```

2. **Ollama connection refused**:
   ```bash
   ollama serve  # Start Ollama server manually
   ```

3. **HuggingFace model download slow**:
   - First run downloads ~1GB model
   - Subsequent runs are fast

4. **API key errors**:
   - Double-check your API key
   - Ensure it's in your `.env` file
   - Try reactivating your conda environment

## 💡 Pro Tips

1. **Mix providers**: Use cheap/free providers for bulk processing, premium for important papers
2. **Test locally**: Use HuggingFace for development, API providers for production
3. **Monitor usage**: Most free tiers have generous limits but check your usage
4. **Backup options**: Set up multiple providers for redundancy

Happy summarizing! 🎉 