-- 用户个性化推送记录表
CREATE TABLE public.user_digests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- 支持匿名订阅
  date DATE NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]', -- 用户当时的关键词
  papers JSONB NOT NULL DEFAULT '[]', -- 实际推送给用户的论文ID列表
  papers_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, date) -- 每个用户每天只能有一条推送记录
);

-- Enable RLS for user_digests
ALTER TABLE public.user_digests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own digest history
CREATE POLICY "Users can view own digest history" ON public.user_digests
  FOR SELECT USING (auth.uid() = user_id OR email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- Only service role can manage user digests (for agent to insert)
CREATE POLICY "Service role can manage user digests" ON public.user_digests
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX idx_user_digests_user_id ON public.user_digests(user_id);
CREATE INDEX idx_user_digests_email ON public.user_digests(email);
CREATE INDEX idx_user_digests_date ON public.user_digests(date DESC);
CREATE INDEX idx_user_digests_email_date ON public.user_digests(email, date DESC); 