-- Fix subscriptions table to support anonymous subscriptions
-- Only run this if you haven't run it before

-- Check if email column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscriptions' AND column_name = 'email') THEN
        ALTER TABLE public.subscriptions ADD COLUMN email TEXT;
    END IF;
END $$;

-- Make user_id nullable if it isn't already
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'subscriptions' AND column_name = 'user_id' 
               AND is_nullable = 'NO') THEN
        ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;
    END IF;
END $$;

-- Create unique constraint on email for anonymous subscriptions (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_email_unique') THEN
        CREATE UNIQUE INDEX idx_subscriptions_email_unique ON public.subscriptions(email) WHERE user_id IS NULL;
    END IF;
END $$;

-- Add index for email lookups (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_email') THEN
        CREATE INDEX idx_subscriptions_email ON public.subscriptions(email);
    END IF;
END $$;

-- Update RLS policies for subscriptions to handle both authenticated and anonymous users
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.subscriptions;

-- Policy for authenticated users to manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Policy for service role to manage all subscriptions (for the agent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage all subscriptions') THEN
        CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions
          FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Update default summary model to use Groq
UPDATE public.subscriptions SET summary_model = 'llama-3.1-8b-instant-groq' WHERE summary_model = 'claude-opus-4-20250514';

-- Update the default value for new subscriptions
ALTER TABLE public.subscriptions ALTER COLUMN summary_model SET DEFAULT 'llama-3.1-8b-instant-groq'; 