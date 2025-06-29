-- Temporarily reduce keywords to test if the issue is too many API calls

-- Update to use the exact keywords that work in our local test
UPDATE subscriptions 
SET keywords = '[
    "Speech LLM",
    "Chain of Thought",
    "Multimodal LLM"
]'::jsonb
WHERE email = 'qw2443@columbia.edu';

-- Verify the update
SELECT email, keywords FROM subscriptions WHERE email = 'qw2443@columbia.edu';