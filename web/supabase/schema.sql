-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  digest_time TEXT DEFAULT '13:00',
  max_papers INTEGER DEFAULT 20,
  summary_model TEXT DEFAULT 'llama-3.1-8b-instant-groq',
  tone TEXT DEFAULT 'concise',
  include_pdf_link BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Papers table
CREATE TABLE public.papers (
  id TEXT PRIMARY KEY, -- arXiv ID
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors JSONB NOT NULL DEFAULT '[]',
  published TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  processed_content TEXT, -- Full processed content for detailed view
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for papers (public read access)
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- Anyone can read papers
CREATE POLICY "Anyone can view papers" ON public.papers
  FOR SELECT USING (true);

-- Only service role can insert/update papers
CREATE POLICY "Service role can manage papers" ON public.papers
  FOR ALL USING (auth.role() = 'service_role');

-- User Papers table (bookmarks, ratings, etc.)
CREATE TABLE public.user_papers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  paper_id TEXT REFERENCES public.papers(id) ON DELETE CASCADE NOT NULL,
  bookmarked BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, paper_id)
);

-- Enable RLS for user_papers
ALTER TABLE public.user_papers ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own paper interactions
CREATE POLICY "Users can manage own paper interactions" ON public.user_papers
  FOR ALL USING (auth.uid() = user_id);

-- Digest History table
CREATE TABLE public.digest_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  papers JSONB NOT NULL DEFAULT '[]', -- Array of paper IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for digest_history (public read access)
ALTER TABLE public.digest_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read digest history
CREATE POLICY "Anyone can view digest history" ON public.digest_history
  FOR SELECT USING (true);

-- Only service role can manage digest history
CREATE POLICY "Service role can manage digest history" ON public.digest_history
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(active);
CREATE INDEX idx_papers_published ON public.papers(published DESC);
CREATE INDEX idx_papers_categories ON public.papers USING GIN(categories);
CREATE INDEX idx_user_papers_user_id ON public.user_papers(user_id);
CREATE INDEX idx_user_papers_bookmarked ON public.user_papers(bookmarked);
CREATE INDEX idx_digest_history_date ON public.digest_history(date DESC);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, image)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'picture'
  );
  
  -- Create default subscription
  INSERT INTO public.subscriptions (user_id, keywords)
  VALUES (NEW.id, '["machine learning", "AI"]');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at(); 