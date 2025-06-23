-- Safe migration script that checks for existing tables
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check and create subscriptions table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
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
        RAISE NOTICE 'Created subscriptions table';
    ELSE
        RAISE NOTICE 'subscriptions table already exists';
    END IF;
END $$;

-- Check and create papers table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'papers') THEN
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
        RAISE NOTICE 'Created papers table';
    ELSE
        RAISE NOTICE 'papers table already exists';
    END IF;
END $$;

-- Check and create digest_history table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'digest_history') THEN
        CREATE TABLE digest_history (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            paper_count INTEGER NOT NULL,
            paper_ids TEXT[] NOT NULL,
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created digest_history table';
    ELSE
        RAISE NOTICE 'digest_history table already exists';
    END IF;
END $$;

-- Check and create user_digests table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_digests') THEN
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
        RAISE NOTICE 'Created user_digests table';
    ELSE
        RAISE NOTICE 'user_digests table already exists';
    END IF;
END $$;

-- Check and create user_bookmarks table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') THEN
        CREATE TABLE user_bookmarks (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        RAISE NOTICE 'Created user_bookmarks table';
    ELSE
        RAISE NOTICE 'user_bookmarks table already exists';
    END IF;
END $$;

-- Check and create user_ratings table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        CREATE TABLE user_ratings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        RAISE NOTICE 'Created user_ratings table';
    ELSE
        RAISE NOTICE 'user_ratings table already exists';
    END IF;
END $$;

-- Create indexes (IF NOT EXISTS is safe for indexes)
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date);
CREATE INDEX IF NOT EXISTS idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date);
CREATE INDEX IF NOT EXISTS idx_user_digests_email_date ON user_digests(email, date);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);

-- Create or replace the trigger function (safe to replace)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Check and create trigger if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_subscriptions_updated_at'
    ) THEN
        CREATE TRIGGER update_subscriptions_updated_at 
            BEFORE UPDATE ON subscriptions 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update trigger for subscriptions';
    ELSE
        RAISE NOTICE 'Update trigger already exists';
    END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own digests" ON user_digests;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON user_bookmarks;
DROP POLICY IF EXISTS "Users can manage own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Papers are publicly readable" ON papers;
DROP POLICY IF EXISTS "Digest history is publicly readable" ON digest_history;
DROP POLICY IF EXISTS "Service role full access" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access" ON papers;
DROP POLICY IF EXISTS "Service role full access" ON digest_history;
DROP POLICY IF EXISTS "Service role full access" ON user_digests;

-- Create RLS policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own digests" ON user_digests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Papers are publicly readable" ON papers
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Digest history is publicly readable" ON digest_history
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access papers" ON papers
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access digest_history" ON digest_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access user_digests" ON user_digests
    FOR ALL TO service_role USING (true);

-- Final status check
DO $$ 
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings');
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Setup complete! Tables: %, Policies: %', table_count, policy_count;
END $$;