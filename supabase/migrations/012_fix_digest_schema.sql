-- Fix digest_history table structure

-- Check current columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'digest_history' ORDER BY ordinal_position;

-- Add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'paper_count') THEN
        ALTER TABLE digest_history ADD COLUMN paper_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'generated_at') THEN
        ALTER TABLE digest_history ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;