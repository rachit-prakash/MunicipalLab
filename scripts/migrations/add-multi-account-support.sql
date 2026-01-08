-- Migration: Add multi-account support
-- This migration allows users to connect multiple Gmail accounts

-- Step 1: Add id column to gmail_accounts and make it the primary key
ALTER TABLE gmail_accounts DROP CONSTRAINT IF EXISTS gmail_accounts_pkey;
ALTER TABLE gmail_accounts ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE gmail_accounts SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE gmail_accounts ALTER COLUMN id SET NOT NULL;
ALTER TABLE gmail_accounts ADD PRIMARY KEY (id);

-- Step 2: Add unique constraint on (user_id, email) to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS gmail_accounts_user_email_unique ON gmail_accounts(user_id, email);

-- Step 3: Add gmail_account_id to threads table
ALTER TABLE threads ADD COLUMN IF NOT EXISTS gmail_account_id UUID;
ALTER TABLE threads ADD CONSTRAINT threads_gmail_account_id_fkey
  FOREIGN KEY (gmail_account_id) REFERENCES gmail_accounts(id) ON DELETE CASCADE;

-- Step 4: Add gmail_account_id to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS gmail_account_id UUID;
ALTER TABLE messages ADD CONSTRAINT messages_gmail_account_id_fkey
  FOREIGN KEY (gmail_account_id) REFERENCES gmail_accounts(id) ON DELETE CASCADE;

-- Step 5: Backfill gmail_account_id for existing data
-- Set gmail_account_id for existing threads based on tenant_id
UPDATE threads t
SET gmail_account_id = (
  SELECT ga.id
  FROM gmail_accounts ga
  WHERE ga.tenant_id = t.tenant_id
  LIMIT 1
)
WHERE gmail_account_id IS NULL;

-- Set gmail_account_id for existing messages based on tenant_id
UPDATE messages m
SET gmail_account_id = (
  SELECT ga.id
  FROM gmail_accounts ga
  WHERE ga.tenant_id = m.tenant_id
  LIMIT 1
)
WHERE gmail_account_id IS NULL;

-- Step 6: Add is_primary column to gmail_accounts to mark the primary account
ALTER TABLE gmail_accounts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Set the first account for each user as primary
UPDATE gmail_accounts ga
SET is_primary = true
WHERE id IN (
  SELECT DISTINCT ON (user_id) id
  FROM gmail_accounts
  ORDER BY user_id, created_at ASC
);

-- Step 7: Add display_name column for account labels
ALTER TABLE gmail_accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
UPDATE gmail_accounts SET display_name = email WHERE display_name IS NULL;

COMMENT ON TABLE gmail_accounts IS 'Gmail accounts connected by users. Users can have multiple accounts.';
COMMENT ON COLUMN gmail_accounts.id IS 'Primary key for gmail_accounts';
COMMENT ON COLUMN gmail_accounts.is_primary IS 'Whether this is the users primary account';
COMMENT ON COLUMN gmail_accounts.display_name IS 'Display name for the account (defaults to email)';
