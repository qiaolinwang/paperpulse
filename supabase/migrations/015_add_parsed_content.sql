-- Add parsed content storage for papers
ALTER TABLE papers ADD COLUMN IF NOT EXISTS parsed_figures JSONB;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS parsed_sections JSONB;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS parsing_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE papers ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS extraction_method VARCHAR(100);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_papers_parsing_status ON papers(parsing_status);
CREATE INDEX IF NOT EXISTS idx_papers_last_parsed ON papers(last_parsed_at);

-- Comments
COMMENT ON COLUMN papers.parsed_figures IS 'JSON array of extracted figures and tables';
COMMENT ON COLUMN papers.parsed_sections IS 'JSON array of extracted paper sections';
COMMENT ON COLUMN papers.parsing_status IS 'pending, processing, completed, failed';
COMMENT ON COLUMN papers.extraction_method IS 'Method used for extraction (pdf-parse, pdfjs, fallback)';