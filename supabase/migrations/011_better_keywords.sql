-- Update with broader, more common keywords that will definitely find papers

UPDATE subscriptions 
SET keywords = '[
    "transformer", 
    "attention",
    "neural network",
    "deep learning",
    "language model"
]'::jsonb
WHERE email = 'qw2443@columbia.edu';

-- These are very common terms that should find papers every day

-- Verify the update
SELECT email, keywords FROM subscriptions WHERE email = 'qw2443@columbia.edu';