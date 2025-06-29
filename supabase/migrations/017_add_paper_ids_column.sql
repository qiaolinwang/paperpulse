-- Add missing paper_ids column to digest_history table

-- Add paper_ids column as a JSONB array to store list of paper IDs
DO $$
BEGIN
    -- Add paper_ids column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'paper_ids') THEN
        ALTER TABLE digest_history ADD COLUMN paper_ids JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added paper_ids column to digest_history table';
    ELSE
        RAISE NOTICE 'paper_ids column already exists in digest_history table';
    END IF;
END $$;

-- Create an index on paper_ids for better query performance
CREATE INDEX IF NOT EXISTS idx_digest_history_paper_ids ON digest_history USING GIN (paper_ids);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'digest_history' 
ORDER BY ordinal_position; 