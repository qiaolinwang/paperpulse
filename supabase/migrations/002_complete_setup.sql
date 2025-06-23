-- Complete PaperPulse database setup
-- This script adds missing tables and policies to your existing setup

-- First, let's check what columns exist in your current tables
-- Run this to see the structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscriptions';

-- Add missing tables
DO $$ 
BEGIN
    -- Create user_bookmarks if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') THEN
        CREATE TABLE user_bookmarks (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        RAISE NOTICE '✅ Created user_bookmarks table';
    END IF;

    -- Create user_ratings if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        CREATE TABLE user_ratings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        RAISE NOTICE '✅ Created user_ratings table';
    END IF;
END $$;

-- Add any missing columns to existing tables
DO $$
BEGIN
    -- Check if summary_model column exists in subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'summary_model'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN summary_model TEXT DEFAULT 'llama-3.1-8b-instant-groq';
        RAISE NOTICE '✅ Added summary_model column to subscriptions';
    END IF;

    -- Check if keywords_matched exists in papers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'keywords_matched'
    ) THEN
        ALTER TABLE papers ADD COLUMN keywords_matched TEXT[];
        RAISE NOTICE '✅ Added keywords_matched column to papers';
    END IF;

    -- Check if updated_at exists in subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to subscriptions';
    END IF;
END $$;

-- Create all necessary indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date);
CREATE INDEX IF NOT EXISTS idx_papers_categories ON papers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date);
CREATE INDEX IF NOT EXISTS idx_user_digests_email_date ON user_digests(email, date);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to subscriptions if not exists
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
        RAISE NOTICE '✅ Added update trigger to subscriptions';
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to recreate them cleanly
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Create all RLS policies
-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL TO service_role USING (true);

-- Papers policies (public read)
CREATE POLICY "Papers are publicly readable" ON papers
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage papers" ON papers
    FOR ALL TO service_role USING (true);

-- Digest history policies (public read)
CREATE POLICY "Digest history is publicly readable" ON digest_history
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage digest history" ON digest_history
    FOR ALL TO service_role USING (true);

-- User digests policies
CREATE POLICY "Users can view own digests" ON user_digests
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage user digests" ON user_digests
    FOR ALL TO service_role USING (true);

-- User bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- User ratings policies
CREATE POLICY "Users can manage own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Final verification
DO $$ 
DECLARE
    missing_tables TEXT[];
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check for any missing tables
    SELECT array_agg(t) INTO missing_tables
    FROM unnest(ARRAY['subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings']) t
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t
    );

    IF missing_tables IS NOT NULL THEN
        RAISE WARNING 'Missing tables: %', missing_tables;
    END IF;

    -- Count tables and policies
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings');
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '✅ Setup verification: % tables, % RLS policies', table_count, policy_count;
    RAISE NOTICE '✅ Database setup complete!';
END $$;