-- Fix missing constraints and complete setup

-- First, check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'subscriptions'
ORDER BY tc.constraint_type;

-- Add unique constraint on email if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'subscriptions' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%email%'
    ) THEN
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_email_unique UNIQUE (email);
        RAISE NOTICE '✅ Added unique constraint on subscriptions.email';
    END IF;
END $$;

-- Create missing tables
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

-- Add missing columns to subscriptions
DO $$
BEGIN
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
    
    RAISE NOTICE '✅ Updated subscriptions table structure';
END $$;

-- Add missing columns to papers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'arxiv_id') THEN
        ALTER TABLE papers ADD COLUMN arxiv_id TEXT;
        UPDATE papers SET arxiv_id = id WHERE arxiv_id IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_arxiv_id_unique ON papers(arxiv_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'keywords_matched') THEN
        ALTER TABLE papers ADD COLUMN keywords_matched TEXT[];
    END IF;
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
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date);
CREATE INDEX IF NOT EXISTS idx_user_digests_email_date ON user_digests(email, date);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
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

-- Create policies
CREATE POLICY "Subscriptions - public read" ON subscriptions
    FOR SELECT USING (true);

CREATE POLICY "Subscriptions - public insert" ON subscriptions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Subscriptions - service role all" ON subscriptions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Papers - public read" ON papers
    FOR SELECT USING (true);

CREATE POLICY "Papers - service role all" ON papers
    FOR ALL TO service_role USING (true);

CREATE POLICY "Digest history - public read" ON digest_history
    FOR SELECT USING (true);

CREATE POLICY "Digest history - service role all" ON digest_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "User digests - public read" ON user_digests
    FOR SELECT USING (true);

CREATE POLICY "User digests - service role all" ON user_digests
    FOR ALL TO service_role USING (true);

CREATE POLICY "User bookmarks - user managed" ON user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "User ratings - user managed" ON user_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Now insert/update subscription with proper JSONB format
INSERT INTO subscriptions (email, keywords, active)
VALUES (
    'qw2443@columbia.edu', 
    '["machine learning", "AI"]'::jsonb,
    true
)
ON CONFLICT (email) 
DO UPDATE SET 
    active = true,
    keywords = EXCLUDED.keywords,
    updated_at = NOW()
RETURNING *;

-- Alternative: If ON CONFLICT still fails, use upsert logic
DO $$
DECLARE
    existing_id UUID;
BEGIN
    -- Check if subscription exists
    SELECT id INTO existing_id 
    FROM subscriptions 
    WHERE email = 'qw2443@columbia.edu';
    
    IF existing_id IS NULL THEN
        -- Insert new
        INSERT INTO subscriptions (email, keywords, active)
        VALUES ('qw2443@columbia.edu', '["machine learning", "AI"]'::jsonb, true);
        RAISE NOTICE '✅ Created new subscription for qw2443@columbia.edu';
    ELSE
        -- Update existing
        UPDATE subscriptions 
        SET keywords = '["machine learning", "AI"]'::jsonb,
            active = true,
            updated_at = NOW()
        WHERE id = existing_id;
        RAISE NOTICE '✅ Updated existing subscription for qw2443@columbia.edu';
    END IF;
END $$;

-- Final verification
SELECT 
    email, 
    keywords,
    active,
    summary_model,
    created_at
FROM subscriptions 
WHERE email = 'qw2443@columbia.edu';

-- Show all constraints on subscriptions table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    string_agg(kcu.column_name, ', ') as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'subscriptions'
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_type;