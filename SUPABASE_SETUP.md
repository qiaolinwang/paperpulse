# 📚 PaperPulse Supabase Setup Guide

This guide will help you set up the Supabase database for PaperPulse v2.0.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a database password and region
3. Wait for the project to be ready (~2 minutes)

### 2. Get Your Credentials

In your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (anon key section)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend/agent)

### 3. Run Database Schema

Go to **SQL Editor** in your Supabase dashboard and run this schema:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (handled by Supabase Auth automatically)
-- We'll reference auth.users for user management

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    keywords TEXT[] NOT NULL,
    digest_time TEXT DEFAULT '13:00',
    max_papers INTEGER DEFAULT 20,
    summary_model TEXT DEFAULT 'llama-3.1-8b-instant-groq',
    tone TEXT DEFAULT 'concise',
    include_pdf_link BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Papers table
CREATE TABLE papers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    arxiv_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    authors TEXT[] NOT NULL,
    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    categories TEXT[] NOT NULL,
    url TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    summary TEXT,
    keywords_matched TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Digest history table (daily digest records)
CREATE TABLE digest_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    paper_count INTEGER NOT NULL,
    paper_ids TEXT[] NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User digests table (personalized digest records)
CREATE TABLE user_digests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    date DATE NOT NULL,
    keywords TEXT[] NOT NULL,
    paper_count INTEGER NOT NULL,
    papers JSONB NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, date)
);

-- User bookmarks table
CREATE TABLE user_bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
    bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, paper_id)
);

-- User ratings table
CREATE TABLE user_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, paper_id)
);

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_active ON subscriptions(active);
CREATE INDEX idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX idx_papers_published_date ON papers(published_date);
CREATE INDEX idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX idx_digest_history_date ON digest_history(date);
CREATE INDEX idx_user_digests_email_date ON user_digests(email, date);
CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX idx_user_ratings_user_id ON user_ratings(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to subscriptions
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions (users can only see/modify their own)
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for user_digests (users can only see their own)
CREATE POLICY "Users can view own digests" ON user_digests
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for user_bookmarks
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Policies for user_ratings
CREATE POLICY "Users can manage own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Allow public read access to papers and digest_history
CREATE POLICY "Papers are publicly readable" ON papers
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Digest history is publicly readable" ON digest_history
    FOR SELECT TO anon, authenticated USING (true);

-- Service role can do everything (for the agent)
CREATE POLICY "Service role full access" ON subscriptions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON papers
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON digest_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access" ON user_digests
    FOR ALL TO service_role USING (true);
```

### 4. Environment Variables

Add these to your GitHub Actions secrets:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_KEY` - Your service role key  
- `GROQ_API_KEY` - Your Groq API key
- `FROM_EMAIL` - Email sender address

## 🧪 Testing

### Test Agent Connection
```bash
cd agent
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
from paperpulse.supabase_client import SupabaseClient
client = SupabaseClient()
print('✅ Connection successful!')
subs = client.get_active_subscriptions()
print(f'📧 Found {len(subs)} subscriptions')
"
```

## 📊 Current Status

**Issue:** Your GitHub Actions workflow is failing because:
1. ✅ Secrets are configured correctly 
2. ❌ Agent can't find subscriber data
3. ❌ No Supabase database connection

**Solution:** 
1. Set up Supabase database with the schema above
2. Add Supabase secrets to GitHub Actions
3. Your existing subscribers in `subscribers.json` will be used as fallback

## 🔄 Migration Path

1. **Immediate Fix:** Set up Supabase as described above
2. **Test locally:** `cd agent && python -m paperpulse.main --dry-run`
3. **Deploy:** Push changes and test GitHub Actions
4. **Migrate data:** Your subscription API already writes to Supabase

Your agent will automatically:
- Try Supabase first (when secrets are set)
- Fall back to JSON file if Supabase fails
- Work with both data sources seamlessly