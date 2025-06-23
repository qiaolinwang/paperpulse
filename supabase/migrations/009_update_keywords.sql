-- Update subscription with better keywords for more paper results

-- Current keywords: ["machine learning", "AI"]
-- New improved keywords:

UPDATE subscriptions 
SET keywords = '[
    "Speech LLM",
    "Chain of Thought", 
    "Multimodal LLM",
    "deep learning",
    "machine learning",
    "transformer",
    "large language model",
    "neural networks"
]'::jsonb
WHERE email = 'qw2443@columbia.edu';

-- Verify the update
SELECT email, keywords FROM subscriptions WHERE email = 'qw2443@columbia.edu';