-- Complete setup working with existing papers table schema
-- Papers table has id as TEXT and authors/categories as JSONB

-- First, add any missing columns to papers
DO $$
BEGIN
    -- Add arxiv_id if missing (for consistency)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'arxiv_id'
    ) THEN
        -- Since id is already the arxiv ID, create arxiv_id as a copy
        ALTER TABLE papers ADD COLUMN arxiv_id TEXT;
        UPDATE papers SET arxiv_id = id;
        ALTER TABLE papers ALTER COLUMN arxiv_id SET NOT NULL;
        CREATE UNIQUE INDEX idx_papers_arxiv_id_unique ON papers(arxiv_id);
        RAISE NOTICE '✅ Added arxiv_id column to papers';
    END IF;

    -- Add keywords_matched if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'keywords_matched'
    ) THEN
        ALTER TABLE papers ADD COLUMN keywords_matched TEXT[];
        RAISE NOTICE '✅ Added keywords_matched to papers';
    END IF;

    -- Rename 'published' to 'published_date' if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'published'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'papers' AND column_name = 'published_date'
    ) THEN
        ALTER TABLE papers RENAME COLUMN published TO published_date;
        RAISE NOTICE '✅ Renamed published to published_date';
    END IF;
END $$;

-- Create user_bookmarks table (using TEXT id reference)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') THEN
        CREATE TABLE user_bookmarks (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id TEXT REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            bookmarked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        CREATE INDEX idx_user_bookmarks_user_id ON user_bookmarks(user_id);
        CREATE INDEX idx_user_bookmarks_paper_id ON user_bookmarks(paper_id);
        RAISE NOTICE '✅ Created user_bookmarks table';
    END IF;
END $$;

-- Create user_ratings table (using TEXT id reference)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        CREATE TABLE user_ratings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id TEXT REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        CREATE INDEX idx_user_ratings_user_id ON user_ratings(user_id);
        CREATE INDEX idx_user_ratings_paper_id ON user_ratings(paper_id);
        RAISE NOTICE '✅ Created user_ratings table';
    END IF;
END $$;

-- Update subscriptions table with missing columns
DO $$
BEGIN
    -- Add all potentially missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'summary_model') THEN
        ALTER TABLE subscriptions ADD COLUMN summary_model TEXT DEFAULT 'llama-3.1-8b-instant-groq';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'tone') THEN
        ALTER TABLE subscriptions ADD COLUMN tone TEXT DEFAULT 'concise';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'include_pdf_link') THEN
        ALTER TABLE subscriptions ADD COLUMN include_pdf_link BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'digest_time') THEN
        ALTER TABLE subscriptions ADD COLUMN digest_time TEXT DEFAULT '13:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'max_papers') THEN
        ALTER TABLE subscriptions ADD COLUMN max_papers INTEGER DEFAULT 20;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'updated_at') THEN
        ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'user_id') THEN
        ALTER TABLE subscriptions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    RAISE NOTICE '✅ Updated subscriptions table';
END $$;

-- Create or update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
        CREATE TRIGGER update_subscriptions_updated_at 
            BEFORE UPDATE ON subscriptions 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_papers_id ON papers(id);
CREATE INDEX IF NOT EXISTS idx_papers_published_date ON papers(published_date);
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date);
CREATE INDEX IF NOT EXISTS idx_user_digests_email_date ON user_digests(email, date);

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (clean slate)
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

-- Create new policies
-- Subscriptions policies
CREATE POLICY "Anyone can view subscriptions temporarily" ON subscriptions
    FOR SELECT USING (true);  -- Temporary for testing

CREATE POLICY "Anyone can insert subscriptions temporarily" ON subscriptions
    FOR INSERT WITH CHECK (true);  -- Temporary for testing

CREATE POLICY "Service role full access" ON subscriptions
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
CREATE POLICY "Anyone can view digests temporarily" ON user_digests
    FOR SELECT USING (true);  -- Temporary for testing

CREATE POLICY "Service role can manage user digests" ON user_digests
    FOR ALL TO service_role USING (true);

-- User bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- User ratings policies
CREATE POLICY "Users can manage own ratings" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Insert or update your subscription
INSERT INTO subscriptions (email, keywords, active)
VALUES ('qw2443@columbia.edu', ARRAY['machine learning', 'AI'], true)
ON CONFLICT (email) 
DO UPDATE SET 
    active = true,
    keywords = EXCLUDED.keywords
RETURNING *;

-- Final check
DO $$ 
DECLARE
    sub_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sub_count FROM subscriptions WHERE active = true;
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('subscriptions', 'papers', 'digest_history', 'user_digests', 'user_bookmarks', 'user_ratings');
    
    RAISE NOTICE E'✅ Setup complete!\nActive subscriptions: %\nTables created: %', sub_count, table_count;
END $$;