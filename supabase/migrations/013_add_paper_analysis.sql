-- Add detailed analysis support to papers table

-- Add detailed_analysis column to store AI-generated analysis
ALTER TABLE papers ADD COLUMN IF NOT EXISTS detailed_analysis jsonb;

-- Add analysis metadata columns
ALTER TABLE papers ADD COLUMN IF NOT EXISTS analysis_generated_at timestamp with time zone;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS analysis_model text;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS analysis_failed boolean DEFAULT false;

-- Add missing paper_count column to digest_history
ALTER TABLE digest_history ADD COLUMN IF NOT EXISTS paper_count integer DEFAULT 0;

-- Update existing digest_history records to have paper_count
UPDATE digest_history 
SET paper_count = jsonb_array_length(papers) 
WHERE paper_count = 0 OR paper_count IS NULL;

-- Create index for faster analysis queries
CREATE INDEX IF NOT EXISTS idx_papers_analysis_generated ON papers(analysis_generated_at) WHERE detailed_analysis IS NOT NULL;

-- Create index for digest_history queries
CREATE INDEX IF NOT EXISTS idx_digest_history_date ON digest_history(date DESC);

-- Add RLS policies for papers detailed_analysis (readable by all)
DROP POLICY IF EXISTS "Papers detailed analysis is readable by all" ON papers;
CREATE POLICY "Papers detailed analysis is readable by all" ON papers FOR SELECT USING (true);

-- Sample detailed_analysis structure (for documentation)
-- detailed_analysis jsonb structure:
-- {
--   "executive_summary": "text",
--   "key_contributions": ["item1", "item2", "item3"],
--   "methodology": "text", 
--   "results": "text",
--   "technical_approach": "text",
--   "significance": "text",
--   "limitations": "text",
--   "technical_difficulty": 1-5,
--   "target_audience": "text"
-- }

COMMENT ON COLUMN papers.detailed_analysis IS 'AI-generated detailed analysis with executive summary, contributions, methodology, results, etc.';
COMMENT ON COLUMN papers.analysis_generated_at IS 'Timestamp when detailed analysis was generated';
COMMENT ON COLUMN papers.analysis_model IS 'AI model used for analysis (e.g. claude-3-haiku-20240307)';
COMMENT ON COLUMN papers.analysis_failed IS 'Whether analysis generation failed for this paper';