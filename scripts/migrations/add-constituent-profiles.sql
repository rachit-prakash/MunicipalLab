-- Migration: Add constituent_profiles table for relationship memory
-- This enables the "Constituent Relationship Memory" feature

CREATE TABLE IF NOT EXISTS public.constituent_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  photo_url text,

  -- Aggregate stats
  total_emails integer NOT NULL DEFAULT 0,
  total_casework integer NOT NULL DEFAULT 0,
  total_correspondence integer NOT NULL DEFAULT 0,
  first_contact timestamp with time zone,
  last_contact timestamp with time zone,

  -- Sentiment tracking
  avg_sentiment numeric(4,3), -- Average sentiment score across all emails
  sentiment_trend text, -- 'improving' | 'declining' | 'stable'
  sentiment_history jsonb, -- Array of {date, sentiment} for trend chart

  -- Topic analysis
  top_topics jsonb, -- [{ topic, count, last_mentioned }]

  -- Key insights
  key_phrases text[], -- ["daughter's asthma", "school funding", etc.]
  stance_history jsonb, -- { topic: { support: count, oppose: count, neutral: count } }

  -- Behavioral patterns
  avg_response_time interval, -- How long office typically takes to respond
  typical_email_days integer[], -- Days of week they typically email (0=Sun, 6=Sat)
  typical_email_hours integer[], -- Hours they typically email (0-23)
  urgency_profile text, -- 'usually_urgent' | 'usually_calm' | 'mixed'

  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_analyzed_at timestamp with time zone,

  CONSTRAINT constituent_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT constituent_profiles_tenant_email_unique UNIQUE (tenant_id, email),
  CONSTRAINT constituent_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX idx_constituent_profiles_tenant_email
  ON public.constituent_profiles (tenant_id, email);

CREATE INDEX idx_constituent_profiles_last_contact
  ON public.constituent_profiles (tenant_id, last_contact DESC);

-- Add analytics index for querying top constituents
CREATE INDEX idx_constituent_profiles_total_emails
  ON public.constituent_profiles (tenant_id, total_emails DESC);

COMMENT ON TABLE public.constituent_profiles IS 'Aggregated constituent relationship memory and intelligence';
COMMENT ON COLUMN public.constituent_profiles.top_topics IS 'Top 5 topics with counts: [{"topic": "Healthcare", "count": 12, "last_mentioned": "2025-01-15"}]';
COMMENT ON COLUMN public.constituent_profiles.sentiment_history IS 'Recent sentiment data points: [{"date": "2025-01-01", "sentiment": -0.4}, {"date": "2025-01-15", "sentiment": 0.2}]';
COMMENT ON COLUMN public.constituent_profiles.stance_history IS 'Stance breakdown by topic: {"Healthcare": {"support": 5, "oppose": 0, "neutral": 2}}';
