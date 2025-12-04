-- Migration: Add pgvector extension and embeddings column
-- This enables semantic search capabilities for RAG (Retrieval-Augmented Generation)

-- Step 1: Enable the pgvector extension
-- This adds vector data types and similarity search functions to PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to messages table
-- text-embedding-3-small produces 1536-dimensional vectors
-- text-embedding-3-large produces 3072-dimensional vectors
-- We'll use 1536 for cost efficiency (you can change to 3072 if needed)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Add embedding column to threads table (for thread-level search)
ALTER TABLE public.threads 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 4: Create index for fast vector similarity search
-- Using ivfflat index with cosine distance (recommended for semantic search)
-- The lists parameter should be roughly sqrt(n) where n is expected row count
-- Start with 100 lists, adjust based on your data size
CREATE INDEX IF NOT EXISTS messages_embedding_idx 
ON public.messages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS threads_embedding_idx 
ON public.threads 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Add helpful indexes for filtering during RAG retrieval
CREATE INDEX IF NOT EXISTS messages_tenant_date_idx 
ON public.messages (tenant_id, internal_date DESC);

CREATE INDEX IF NOT EXISTS threads_tenant_date_idx 
ON public.threads (tenant_id, last_message_ts DESC);

-- Step 6: Create a function for semantic search (messages)
CREATE OR REPLACE FUNCTION search_messages_by_embedding(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_count int DEFAULT 10,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  thread_id uuid,
  from_email text,
  snippet text,
  body_redacted text,
  internal_date timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.thread_id,
    m.from_email,
    m.snippet,
    m.body_redacted,
    m.internal_date,
    1 - (m.embedding <=> query_embedding) as similarity
  FROM public.messages m
  WHERE 
    m.tenant_id = match_tenant_id
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) > min_similarity
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 7: Create a function for semantic search (threads)
CREATE OR REPLACE FUNCTION search_threads_by_embedding(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_count int DEFAULT 10,
  min_similarity float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  subject text,
  summary text,
  topic text,
  stance text,
  last_message_ts timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.subject,
    t.summary,
    t.topic,
    t.stance,
    t.last_message_ts,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM public.threads t
  WHERE 
    t.tenant_id = match_tenant_id
    AND t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> query_embedding)) > min_similarity
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added pgvector extension and embeddings columns!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the generate-embeddings script to populate existing data';
  RAISE NOTICE '2. Update your sync process to generate embeddings for new emails';
END $$;

