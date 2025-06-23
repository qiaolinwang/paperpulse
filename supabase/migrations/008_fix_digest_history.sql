-- Fix digest_history table missing generated_at column

-- Check current structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'digest_history'
ORDER BY ordinal_position;

-- Add missing generated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'digest_history' AND column_name = 'generated_at'
    ) THEN
        ALTER TABLE digest_history ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added generated_at column to digest_history';
    END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'digest_history'
ORDER BY ordinal_position;