-- Create user_papers table for bookmarks and ratings
-- This replaces the confusing mix of user_bookmarks and user_papers

DO $$ 
BEGIN
    -- Create user_papers table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_papers') THEN
        CREATE TABLE user_papers (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            paper_id TEXT REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
            bookmarked BOOLEAN DEFAULT false,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, paper_id)
        );
        
        CREATE INDEX idx_user_papers_user_id ON user_papers(user_id);
        CREATE INDEX idx_user_papers_paper_id ON user_papers(paper_id);
        CREATE INDEX idx_user_papers_bookmarked ON user_papers(bookmarked);
        
        RAISE NOTICE '✅ Created user_papers table';
    END IF;

    -- Enable RLS
    ALTER TABLE user_papers ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies for user_papers
    DROP POLICY IF EXISTS "Users can manage own papers" ON user_papers;
    DROP POLICY IF EXISTS "User papers - user managed" ON user_papers;

    -- Create RLS policy
    CREATE POLICY "Users can manage own papers" ON user_papers
        FOR ALL USING (auth.uid() = user_id);
        
    RAISE NOTICE '✅ Set up RLS policies for user_papers';
END $$;

-- Migrate data from user_bookmarks to user_papers if needed
DO $$
BEGIN
    -- Check if user_bookmarks table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookmarks') THEN
        -- Migrate bookmarks data
        INSERT INTO user_papers (user_id, paper_id, bookmarked, created_at)
        SELECT user_id, paper_id, true, bookmarked_at
        FROM user_bookmarks
        ON CONFLICT (user_id, paper_id) 
        DO UPDATE SET 
            bookmarked = true,
            created_at = LEAST(user_papers.created_at, EXCLUDED.created_at);
            
        RAISE NOTICE '✅ Migrated data from user_bookmarks to user_papers';
    END IF;

    -- Check if user_ratings table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ratings') THEN
        -- Migrate ratings data
        INSERT INTO user_papers (user_id, paper_id, rating, created_at)
        SELECT user_id, paper_id, rating, rated_at
        FROM user_ratings
        ON CONFLICT (user_id, paper_id) 
        DO UPDATE SET 
            rating = EXCLUDED.rating,
            created_at = LEAST(user_papers.created_at, EXCLUDED.created_at);
            
        RAISE NOTICE '✅ Migrated data from user_ratings to user_papers';
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON user_papers TO service_role;
GRANT ALL ON SEQUENCE user_papers_id_seq TO service_role;

RAISE NOTICE '✅ user_papers table setup complete';