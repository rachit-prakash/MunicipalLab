CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  request_id text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.gmail_accounts (
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  encrypted_refresh_token bytea,
  history_id text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gmail_accounts_pkey PRIMARY KEY (user_id),
  CONSTRAINT gmail_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT gmail_accounts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.memberships (
  user_id uuid NOT NULL,
  role_id text NOT NULL,
  CONSTRAINT memberships_pkey PRIMARY KEY (user_id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT memberships_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  gmail_message_id text NOT NULL,
  from_email text,
  to_email ARRAY,
  internal_date timestamp with time zone,
  snippet text,
  body_redacted text,
  body_enc bytea,
  is_outbound boolean NOT NULL DEFAULT false,
  sentiment_score numeric(3,2), -- AI-analyzed sentiment: -1.0 (negative) to 1.0 (positive)
  urgency_level text CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  urgency_reasons text[], -- Array of urgency flags: 'deadline', 'angry_tone', 'emergency_keywords', etc.
  analyzed_at timestamp with time zone, -- Timestamp when AI analysis was performed
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.threads(id)
);
CREATE TABLE public.roles (
  id text NOT NULL,
  rank integer NOT NULL UNIQUE,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  gmail_thread_id text NOT NULL,
  subject text,
  last_message_ts timestamp with time zone,
  sender_email text,
  type text NOT NULL DEFAULT 'CORRESPONDENCE' CHECK (type = ANY (ARRAY['CASEWORK','CORRESPONDENCE'])),
  topic text,
  stance text,
  summary text,
  confidence numeric(4,3),
  unread boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'pending'::text, 'closed'::text])),
  topic_id uuid,
  assignee_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT threads_pkey PRIMARY KEY (id),
  CONSTRAINT threads_gmail_thread_id_key UNIQUE (gmail_thread_id),
  CONSTRAINT threads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT threads_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id),
  CONSTRAINT threads_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id)
);
CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  topic_id uuid,
  stance text NOT NULL DEFAULT 'GENERIC',
  version integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT templates_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  display_name text,
  timezone text NOT NULL DEFAULT 'America/New_York',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

-- Helpful indexes for analytics + sync
CREATE INDEX idx_threads_tenant_last_message_ts
  ON public.threads (tenant_id, last_message_ts DESC);

CREATE INDEX idx_messages_tenant_internal_date
  ON public.messages (tenant_id, internal_date DESC);

CREATE INDEX idx_messages_tenant_outbound
  ON public.messages (tenant_id, is_outbound);

