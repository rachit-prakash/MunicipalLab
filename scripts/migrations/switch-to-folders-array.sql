-- Migration: Switch from sender_type to folders array
-- This migration replaces the single sender_type column with a flexible folders array
-- that allows threads to belong to multiple classification folders at once.
--
-- Benefits:
-- - No more NULL values (every thread gets at least ['inbox'])
-- - Multi-folder support (thread can be ['inbox', 'from-people', 'important'])
-- - Better performance (GIN index for array queries)
-- - More scalable (easy to add new folder types)

-- Step 1: Drop the old sender_type column and its index
DROP INDEX IF EXISTS idx_threads_sender_type;
ALTER TABLE public.threads DROP COLUMN IF EXISTS sender_type;

-- Step 2: Add the new folders array column with default value
ALTER TABLE public.threads
ADD COLUMN folders text[] DEFAULT ARRAY['inbox']::text[];

-- Step 3: Create GIN index for efficient array queries
-- GIN (Generalized Inverted Index) is optimized for array containment queries
CREATE INDEX idx_threads_folders ON public.threads USING GIN (folders);

-- Step 4: Add B-tree index for tenant + last_message_ts (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_threads_tenant_folders_ts ON public.threads (tenant_id, last_message_ts DESC) WHERE folders IS NOT NULL;

-- Step 5: Add comment explaining the column
COMMENT ON COLUMN public.threads.folders IS 'Array of folder IDs this thread belongs to. Examples: [''inbox''], [''inbox'', ''from-people''], [''inbox'', ''important'', ''from-people'']. Every thread must have at least one folder.';

-- Step 6: Ensure all existing threads have the inbox folder
UPDATE public.threads
SET folders = ARRAY['inbox']::text[]
WHERE folders IS NULL OR array_length(folders, 1) IS NULL;
