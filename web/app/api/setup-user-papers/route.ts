import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Create user_papers table
    const { error: createError } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS user_papers (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          paper_id TEXT REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
          bookmarked BOOLEAN DEFAULT false,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, paper_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_papers_user_id ON user_papers(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_papers_paper_id ON user_papers(paper_id);
        CREATE INDEX IF NOT EXISTS idx_user_papers_bookmarked ON user_papers(bookmarked);
        
        ALTER TABLE user_papers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage own papers" ON user_papers;
        CREATE POLICY "Users can manage own papers" ON user_papers
          FOR ALL USING (auth.uid() = user_id);
      `
    })

    if (createError) {
      console.error('Error creating user_papers table:', createError)
      return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'user_papers table created' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}