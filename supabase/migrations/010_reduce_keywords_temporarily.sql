-- Temporarily reduce keywords to test if the issue is too many API calls

-- Reduce to just 3 high-yield keywords for testing
UPDATE subscriptions 
SET keywords = '[
    "Chain of Thought",
    "Multimodal LLM", 
    "large language model"
]'::jsonb
WHERE email = 'qw2443@columbia.edu';

-- Verify the update
SELECT email, keywords FROM subscriptions WHERE email = 'qw2443@columbia.edu';