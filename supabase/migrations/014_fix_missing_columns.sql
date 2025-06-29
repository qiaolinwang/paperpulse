-- Fix missing columns and constraints from the schema

-- Add missing columns to digest_history if they don't exist
DO $$
BEGIN
    -- Add paper_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'paper_count') THEN
        ALTER TABLE digest_history ADD COLUMN paper_count integer DEFAULT 0;
    END IF;
    
    -- Add generated_at if missing 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'generated_at') THEN
        ALTER TABLE digest_history ADD COLUMN generated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Add missing columns to papers table
DO $$
BEGIN
    -- Add keywords_matched if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'keywords_matched') THEN
        ALTER TABLE papers ADD COLUMN keywords_matched text[];
    END IF;
    
    -- Add arxiv_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'papers' AND column_name = 'arxiv_id') THEN
        ALTER TABLE papers ADD COLUMN arxiv_id text;
    END IF;
END $$;

-- Update existing digest_history records to populate paper_count
UPDATE digest_history 
SET paper_count = jsonb_array_length(papers)
WHERE paper_count = 0 OR paper_count IS NULL;

-- Update existing papers to extract arxiv_id from URL if missing
UPDATE papers 
SET arxiv_id = CASE 
    WHEN url LIKE '%arxiv.org/abs/%' THEN 
        SUBSTRING(url FROM 'arxiv\.org/abs/(.+)$')
    ELSE NULL
END
WHERE arxiv_id IS NULL;

-- Verify the updates
SELECT 'digest_history' as table_name, COUNT(*) as records, 
       COUNT(CASE WHEN paper_count > 0 THEN 1 END) as with_paper_count
FROM digest_history
UNION ALL
SELECT 'papers' as table_name, COUNT(*) as records,
       COUNT(CASE WHEN arxiv_id IS NOT NULL THEN 1 END) as with_arxiv_id  
FROM papers;