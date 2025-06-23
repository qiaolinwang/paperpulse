-- Fix type mismatches and complete setup
-- This handles the case where papers.id is TEXT instead of UUID

-- First, let's check the current structure
DO $$
DECLARE
    papers_id_type TEXT;
BEGIN
    SELECT data_type INTO papers_id_type
    FROM information_schema.columns
    WHERE table_name = 'papers' AND column_name = 'id';
    
    RAISE NOTICE 'Current papers.id type: %', papers_id_type;
END $$;

-- Create user_bookmarks with proper reference type
DO $$ 
DECLARE
    papers_id_type TEXT;
BEGIN
    -- Get the actual type of papers.id
    SELECT data_type INTO papers_id_type
    FROM information_schema.columns
    WHERE table_name = 'papers' AND column_name = 'id';

    -- Create user_bookmarks if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') THEN
        IF papers_id_type = 'text' THEN
            -- If papers.id is TEXT, reference arxiv_id instead
            CREATE TABLE user_bookmarks (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                paper_arxiv_id TEXT NOT NULL,
                bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, paper_arxiv_id),
                FOREIGN KEY (paper_arxiv_id) REFERENCES papers(arxiv_id) ON DELETE CASCADE
            );
            RAISE NOTICE '✅ Created user_bookmarks table with arxiv_id reference';
        ELSE
            -- If papers.id is UUID, use standard reference
            CREATE TABLE user_bookmarks (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
                bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, paper_id)
            );
            RAISE NOTICE '✅ Created user_bookmarks table with UUID reference';
        END IF;
    END IF;

    -- Create user_ratings if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        IF papers_id_type = 'text' THEN
            -- If papers.id is TEXT, reference arxiv_id instead
            CREATE TABLE user_ratings (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                paper_arxiv_id TEXT NOT NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, paper_arxiv_id),
                FOREIGN KEY (paper_arxiv_id) REFERENCES papers(arxiv_id) ON DELETE CASCADE
            );
            RAISE NOTICE '✅ Created user_ratings table with arxiv_id reference';
        ELSE
            -- If papers.id is UUID, use standard reference
            CREATE TABLE user_ratings (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                paper_id UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, paper_id)
            );
            RAISE NOTICE '✅ Created user_ratings table with UUID reference';
        END IF;
    END IF;
END $$;

-- Add missing columns to existing tables
DO $$
BEGIN
    -- Check and add columns to subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'summary_model'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN summary_model TEXT DEFAULT 'llama-3.1-8b-instant-groq';
        RAISE NOTICE '✅ Added summary_model to subscriptions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'tone'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN tone TEXT DEFAULT 'concise';
        RAISE NOTICE '✅ Added tone to subscriptions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'include_pdf_link'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN include_pdf_link BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added include_pdf_link to subscriptions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'digest_time'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN digest_time TEXT DEFAULT '13:00';
        RAISE NOTICE '✅ Added digest_time to subscriptions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'max_papers'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN max_papers INTEGER DEFAULT 20;
        RAISE NOTICE '✅ Added max_papers to subscriptions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at to subscriptions';
    END IF;

    -- Check and add columns to papers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'keywords_matched'
    ) THEN
        ALTER TABLE papers ADD COLUMN keywords_matched TEXT[];
        RAISE NOTICE '✅ Added keywords_matched to papers';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'summary'
    ) THEN
        ALTER TABLE papers ADD COLUMN summary TEXT;
        RAISE NOTICE '✅ Added summary to papers';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date);
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date);
CREATE INDEX IF NOT EXISTS idx_user_digests_email_date ON user_digests(email, date);

-- Create indexes for the bookmark/rating tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_bookmarks' AND column_name = 'paper_arxiv_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_bookmarks_paper_arxiv_id ON user_bookmarks(paper_arxiv_id);
    ELSE
        CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON user_bookmarks(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_bookmarks_paper_id ON user_bookmarks(paper_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_ratings' AND column_name = 'paper_arxiv_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_ratings_paper_arxiv_id ON user_ratings(paper_arxiv_id);
    ELSE
        CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_ratings_paper_id ON user_ratings(paper_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
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

-- Create RLS policies
-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON subscriptions
    FOR ALL TO service_role USING (true);

-- Papers (public read)
CREATE POLICY "Public read access" ON papers
    FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON papers
    FOR ALL TO service_role USING (true);

-- Digest history (public read)
CREATE POLICY "Public read access" ON digest_history
    FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON digest_history
    FOR ALL TO service_role USING (true);

-- User digests
CREATE POLICY "Users view own digests" ON user_digests
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role full access" ON user_digests
    FOR ALL TO service_role USING (true);

-- User bookmarks
CREATE POLICY "Users manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- User ratings
CREATE POLICY "Users manage own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Verification
DO $$ 
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    structure_info TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings');
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- Show structure info
    SELECT string_agg(
        format('%s.%s: %s', c.table_name, c.column_name, c.data_type), 
        E'\n'
    ) INTO structure_info
    FROM information_schema.columns c
    WHERE c.table_name IN ('papers', 'user_bookmarks', 'user_ratings')
    AND c.column_name IN ('id', 'paper_id', 'paper_arxiv_id', 'arxiv_id')
    ORDER BY c.table_name, c.column_name;
    
    RAISE NOTICE E'✅ Setup complete!\nTables: %\nPolicies: %\n\nKey columns:\n%', 
        table_count, policy_count, structure_info;
END $$;

-- Insert your subscription if it doesn't exist
INSERT INTO subscriptions (email, keywords, active)
VALUES ('qw2443@columbia.edu', ARRAY['machine learning', 'AI'], true)
ON CONFLICT (email) 
DO UPDATE SET 
    active = true,
    keywords = EXCLUDED.keywords
RETURNING *;