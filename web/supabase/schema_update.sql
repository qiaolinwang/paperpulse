-- Add thumbnail_url field to papers table
ALTER TABLE public.papers 
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN thumbnail_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN thumbnail_failed BOOLEAN DEFAULT false;

-- Create index for thumbnail lookups
CREATE INDEX idx_papers_thumbnail_url ON public.papers(thumbnail_url);
CREATE INDEX idx_papers_thumbnail_generated ON public.papers(thumbnail_generated_at);

-- Comment: This allows us to store PDF thumbnail URLs and track when they were generated
-- thumbnail_url: The URL of the generated thumbnail image
-- thumbnail_generated_at: When the thumbnail was last generated
-- thumbnail_failed: Whether thumbnail generation failed (to avoid retrying immediately)

-- Update subscriptions table to support anonymous subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN email TEXT,
ALTER COLUMN user_id DROP NOT NULL;

-- Create unique constraint on email for anonymous subscriptions
CREATE UNIQUE INDEX idx_subscriptions_email_unique ON public.subscriptions(email) WHERE user_id IS NULL;

-- Add index for email lookups
CREATE INDEX idx_subscriptions_email ON public.subscriptions(email);

-- Update RLS policies for subscriptions to handle both authenticated and anonymous users
DROP POLICY "Users can manage own subscriptions" ON public.subscriptions;

-- Policy for authenticated users to manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Policy for service role to manage all subscriptions (for the agent)
CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for anonymous subscriptions (read-only for the specific email)
CREATE POLICY "Anonymous users can view own subscription by email" ON public.subscriptions
  FOR SELECT USING (user_id IS NULL AND email = current_setting('request.header.x-user-email', true));

-- Comment: Anonymous subscriptions workflow:
-- 1. User subscribes via API without auth - stored with email only (user_id = NULL)
-- 2. If user later signs up with same email, we can link the subscription to their user_id
-- 3. Service role (Python agent) can read all active subscriptions for sending digests 