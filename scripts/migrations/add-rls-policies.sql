-- Migration: Enable Row Level Security on all tables
-- Purpose: Protect data if database credentials are compromised
-- Run with: psql $DATABASE_URL -f add-rls-policies.sql

-- ============================================================================
-- IMPORTANT: How RLS works with Supabase
-- ============================================================================
-- 1. Service Role Key (SUPABASE_SERVICE_ROLE_KEY) BYPASSES RLS
--    - Use this in your backend for admin operations
-- 2. Anon Key (SUPABASE_ANON_KEY) RESPECTS RLS
--    - Use this for client-side queries (if any)
-- 3. For backend queries, we set app.tenant_id before each request
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Enable RLS on all core tables
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituent_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Create tenant isolation policies
-- ============================================================================
-- These policies ensure users can only access data for their tenant
-- The tenant_id is set via: SET app.tenant_id = 'uuid-here'

-- Tenants: Users can only see their own tenant
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL
  USING (id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);

-- Users: Tenant isolation
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Gmail Accounts: Tenant isolation
CREATE POLICY tenant_isolation_gmail_accounts ON gmail_accounts
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Threads: Tenant isolation
CREATE POLICY tenant_isolation_threads ON threads
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Messages: Tenant isolation
CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Topics: Tenant isolation
CREATE POLICY tenant_isolation_topics ON topics
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Templates: Tenant isolation
CREATE POLICY tenant_isolation_templates ON templates
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Memberships: Users can only see memberships for users in their tenant
CREATE POLICY tenant_isolation_memberships ON memberships
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users
      WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- Roles: Everyone can read roles (they're global)
CREATE POLICY roles_read_all ON roles
  FOR SELECT
  USING (true);

-- Audit Logs: Tenant isolation (can only see your tenant's audit trail)
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Constituent Profiles: Tenant isolation
CREATE POLICY tenant_isolation_constituent_profiles ON constituent_profiles
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================================
-- Step 3: Grant permissions to authenticated role
-- ============================================================================
-- Supabase uses 'authenticated' role for logged-in users

GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gmail_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON constituent_profiles TO authenticated;

-- ============================================================================
-- Step 4: Create helper function to set tenant context
-- ============================================================================
-- Call this at the start of each request in your backend

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, false);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_context(uuid) TO authenticated;

-- ============================================================================
-- Step 5: Create function to get current tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION: Run these queries to verify RLS is enabled
-- ============================================================================
--
-- Check RLS status:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Check policies:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';
--
-- ============================================================================
-- USAGE IN YOUR BACKEND (TypeScript/Node.js)
-- ============================================================================
--
-- Option 1: Using Supabase client (recommended)
-- ```typescript
-- import { createClient } from '@supabase/supabase-js'
--
-- // Use service role for backend (bypasses RLS)
-- const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
--
-- // Or set tenant context for RLS-protected queries
-- await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId })
-- const { data } = await supabase.from('threads').select('*')
-- ```
--
-- Option 2: Direct PostgreSQL
-- ```typescript
-- await pool.query('SELECT set_tenant_context($1)', [tenantId])
-- const result = await pool.query('SELECT * FROM threads')
-- ```
--
-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
--
-- ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE gmail_accounts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE threads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE constituent_profiles DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
-- DROP POLICY IF EXISTS tenant_isolation_users ON users;
-- ... etc
