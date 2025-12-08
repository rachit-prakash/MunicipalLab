-- Migration: Add sender classification to threads
-- This adds AI-powered sender classification to distinguish real people from automated services

ALTER TABLE public.threads
ADD COLUMN sender_type text CHECK (sender_type IN ('person', 'automated', 'uncertain'));

-- Add index for filtering by sender type
CREATE INDEX idx_threads_sender_type ON public.threads (tenant_id, sender_type);

-- Add comment explaining the column
COMMENT ON COLUMN public.threads.sender_type IS 'AI-classified sender type: person (real human), automated (bot/service), uncertain (needs review)';
