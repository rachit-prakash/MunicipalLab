-- Migration: Add chat sessions and messages tables
-- This enables saving and loading chat history

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_sessions_tenant_id_idx ON public.chat_sessions (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON public.chat_messages (session_id, created_at ASC);

-- Add RLS policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS chat_sessions_tenant_isolation ON public.chat_sessions;
DROP POLICY IF EXISTS chat_messages_tenant_isolation ON public.chat_messages;

-- Policy: Users can only see their own chat sessions
CREATE POLICY chat_sessions_tenant_isolation ON public.chat_sessions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY chat_messages_tenant_isolation ON public.chat_messages
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions 
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions 
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- Function to auto-generate chat title from first message
CREATE OR REPLACE FUNCTION generate_chat_title(first_message text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Take first 50 characters or up to first newline
  RETURN COALESCE(
    TRIM(SUBSTRING(first_message FROM 1 FOR 50)) || 
    CASE WHEN LENGTH(first_message) > 50 THEN '...' ELSE '' END,
    'New Chat'
  );
END;
$$;

COMMENT ON TABLE public.chat_sessions IS 'Stores AI assistant chat sessions for history';
COMMENT ON TABLE public.chat_messages IS 'Stores individual messages within chat sessions';

