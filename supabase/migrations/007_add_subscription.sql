-- Add subscription for qw2443@columbia.edu

-- First, let's check current subscriptions
SELECT id, email, keywords, active, created_at 
FROM subscriptions 
ORDER BY created_at DESC;

-- Check the exact data type of keywords column
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'keywords';

-- Method 1: Direct insert/update with explicit conflict target
INSERT INTO subscriptions (email, keywords, active)
VALUES (
    'qw2443@columbia.edu', 
    '["machine learning", "AI"]'::jsonb,
    true
)
ON CONFLICT (email)  -- Explicitly specify the conflict column
DO UPDATE SET 
    active = true,
    keywords = EXCLUDED.keywords,
    updated_at = NOW()
RETURNING *;

-- Method 2: If Method 1 fails, try manual check and insert/update
DO $$
DECLARE
    sub_exists BOOLEAN;
    sub_id UUID;
BEGIN
    -- Check if subscription exists
    SELECT EXISTS(SELECT 1 FROM subscriptions WHERE email = 'qw2443@columbia.edu') INTO sub_exists;
    
    IF NOT sub_exists THEN
        -- Insert new subscription
        INSERT INTO subscriptions (
            email, 
            keywords, 
            active,
            summary_model,
            tone,
            include_pdf_link,
            digest_time,
            max_papers
        )
        VALUES (
            'qw2443@columbia.edu', 
            '["machine learning", "AI"]'::jsonb,
            true,
            'llama-3.1-8b-instant-groq',
            'concise',
            true,
            '13:00',
            20
        )
        RETURNING id INTO sub_id;
        
        RAISE NOTICE '✅ Created new subscription with ID: %', sub_id;
    ELSE
        -- Update existing subscription
        UPDATE subscriptions 
        SET 
            keywords = '["machine learning", "AI"]'::jsonb,
            active = true,
            summary_model = COALESCE(summary_model, 'llama-3.1-8b-instant-groq'),
            tone = COALESCE(tone, 'concise'),
            include_pdf_link = COALESCE(include_pdf_link, true),
            digest_time = COALESCE(digest_time, '13:00'),
            max_papers = COALESCE(max_papers, 20),
            updated_at = NOW()
        WHERE email = 'qw2443@columbia.edu'
        RETURNING id INTO sub_id;
        
        RAISE NOTICE '✅ Updated existing subscription with ID: %', sub_id;
    END IF;
END $$;

-- Verify the subscription was added/updated
SELECT 
    id,
    email, 
    keywords,
    active,
    summary_model,
    tone,
    max_papers,
    created_at,
    updated_at
FROM subscriptions 
WHERE email = 'qw2443@columbia.edu';

-- Also check total active subscriptions
SELECT COUNT(*) as active_subscription_count 
FROM subscriptions 
WHERE active = true;

-- Let's also make sure all required columns exist and have proper defaults
DO $$
BEGIN
    -- Ensure all columns have proper defaults
    ALTER TABLE subscriptions 
    ALTER COLUMN summary_model SET DEFAULT 'llama-3.1-8b-instant-groq',
    ALTER COLUMN tone SET DEFAULT 'concise',
    ALTER COLUMN include_pdf_link SET DEFAULT true,
    ALTER COLUMN digest_time SET DEFAULT '13:00',
    ALTER COLUMN max_papers SET DEFAULT 20;
    
    RAISE NOTICE '✅ Set default values for subscription columns';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some defaults may already be set: %', SQLERRM;
END $$;