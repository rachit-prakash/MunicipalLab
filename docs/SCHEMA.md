# Database Schema Documentation

This document describes the database schema for the MunicipalLabs CRM application.

## Overview

The application uses PostgreSQL with a multi-tenant architecture. All data is isolated by `tenant_id` using PostgreSQL's session variables and row-level security principles.

## Entity Relationship Diagram

```
tenants
  ├── users
  │   ├── gmail_accounts
  │   └── memberships → roles
  ├── topics
  ├── threads
  │   ├── assignee → users
  │   ├── topic → topics
  │   └── messages
  └── audit_logs
```

## Tables

### `tenants`

Represents organizations using the CRM.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Tenant unique identifier |
| `name` | `text` | NOT NULL, UNIQUE | Tenant name |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique constraint on `name`

---

### `users`

Application users within a tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | User unique identifier |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `email` | `text` | NOT NULL | User email address |
| `display_name` | `text` | NULL | User's display name |
| `timezone` | `text` | NOT NULL, DEFAULT 'America/New_York' | User's timezone |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `tenant_id`
- Index on `email`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE

**Notes:**
- Email is not globally unique (different tenants can have same email)
- Combination of `tenant_id` + `email` should be unique per tenant

---

### `gmail_accounts`

Stores Gmail account connections and encrypted refresh tokens.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FK → users(id) | Associated user |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `email` | `text` | NOT NULL | Gmail email address |
| `encrypted_refresh_token` | `bytea` | NULL | Encrypted OAuth refresh token |
| `history_id` | `text` | NULL | Gmail history ID for incremental sync |
| `last_sync_at` | `timestamptz` | NULL | Last successful sync timestamp |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `user_id`
- Index on `tenant_id`

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `tenant_id` → `tenants(id)` ON DELETE CASCADE

**Security:**
- `encrypted_refresh_token` is encrypted using `lib/tokenVault.ts`
- Stored as bytea for binary encryption data

---

### `roles`

User roles for role-based access control (RBAC).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PRIMARY KEY | Role identifier (e.g., 'admin', 'manager') |
| `rank` | `integer` | NOT NULL, UNIQUE | Role hierarchy (lower = higher privilege) |

**Default Roles:**
- `admin` (rank 1) - Full system access
- `manager` (rank 2) - Can manage threads and topics
- `agent` (rank 3) - Can respond to threads

---

### `memberships`

User-role associations (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `uuid` | PRIMARY KEY, FK → users(id) | Associated user |
| `role_id` | `text` | PRIMARY KEY, FK → roles(id) | Associated role |

**Indexes:**
- Composite primary key on `(user_id, role_id)`

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `role_id` → `roles(id)` ON DELETE CASCADE

**Notes:**
- One user = one role (enforced by primary key on user_id)
- To change role, delete old membership and insert new one

---

### `topics`

Topic categories for email classification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Topic unique identifier |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `name` | `text` | NOT NULL | Topic name |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `tenant_id`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE

---

### `threads`

Email thread metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Thread unique identifier |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `gmail_thread_id` | `text` | NOT NULL, UNIQUE | Gmail thread ID |
| `subject` | `text` | NULL | Thread subject |
| `last_message_ts` | `timestamptz` | NULL | Timestamp of last message |
| `status` | `text` | NOT NULL, DEFAULT 'open', CHECK | Thread status (open/pending/closed) |
| `topic_id` | `uuid` | NULL, FK → topics(id) | Assigned topic |
| `assignee_id` | `uuid` | NULL, FK → users(id) | Assigned user |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `gmail_thread_id`
- Index on `tenant_id`
- Index on `topic_id`
- Index on `assignee_id`
- Index on `status`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `topic_id` → `topics(id)` ON DELETE SET NULL
- `assignee_id` → `users(id)` ON DELETE SET NULL

**Constraints:**
- `status` CHECK: Must be 'open', 'pending', or 'closed'

---

### `messages`

Individual email messages within threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Message unique identifier |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `thread_id` | `uuid` | NOT NULL, FK → threads(id) | Associated thread |
| `gmail_message_id` | `text` | NOT NULL, UNIQUE | Gmail message ID |
| `from_email` | `text` | NULL | Sender email |
| `to_email` | `text[]` | NULL | Recipient emails (array) |
| `internal_date` | `timestamptz` | NULL | Gmail internal date |
| `snippet` | `text` | NULL | Message preview snippet |
| `body_redacted` | `text` | NULL | Redacted message body (PII removed) |
| `body_enc` | `bytea` | NULL | Encrypted full message body |
| `is_outbound` | `boolean` | NOT NULL, DEFAULT false | True if sent by user |
| `sentiment_score` | `numeric` | NULL | AI sentiment analysis score |
| `urgency_level` | `text` | NULL, CHECK | Urgency level (low/medium/high/critical) |
| `urgency_reasons` | `text[]` | NULL | Reasons for urgency classification |
| `analyzed_at` | `timestamptz` | NULL | Timestamp of AI analysis |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `gmail_message_id`
- Index on `thread_id`
- Index on `tenant_id`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `thread_id` → `threads(id)` ON DELETE CASCADE

**Constraints:**
- `urgency_level` CHECK: Must be 'low', 'medium', 'high', or 'critical'

**Security:**
- `body_enc` is encrypted using `lib/tokenVault.ts`
- `body_redacted` has PII removed using `lib/sanitizer.ts`

---

### `audit_logs`

Audit trail for compliance and debugging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Log entry identifier |
| `tenant_id` | `uuid` | NOT NULL, FK → tenants(id) | Associated tenant |
| `actor_user_id` | `uuid` | NULL, FK → users(id) | User who performed action |
| `action` | `text` | NOT NULL | Action type (e.g., 'user.delete') |
| `target_type` | `text` | NULL | Type of affected resource |
| `target_id` | `uuid` | NULL | ID of affected resource |
| `request_id` | `text` | NULL | Request ID for correlation |
| `payload` | `jsonb` | NULL | Additional context data |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Log timestamp |

**Indexes:**
- Primary key on `id`
- Index on `tenant_id`
- Index on `actor_user_id`

**Foreign Keys:**
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `actor_user_id` → `users(id)` ON DELETE SET NULL

**Notes:**
- `actor_user_id` can be NULL (for system actions or when user is deleted)
- `payload` stores arbitrary JSON data for additional context

---

## Multi-Tenancy

### How It Works

1. **Tenant Isolation:**
   - Every table (except `roles`) has a `tenant_id` column
   - All queries use `withTenant()` wrapper from `lib/db.ts`

2. **Query Pattern:**
```typescript
await withTenant(tenantId, async (client) => {
  // Sets: SET LOCAL app.tenant_id = 'uuid'
  // All queries in this transaction only see this tenant's data
  const result = await client.query('SELECT * FROM users WHERE ...');
  return result;
});
```

3. **Session Variable:**
   - `app.tenant_id` is set at transaction level
   - Row-level security policies (if implemented) can use this

4. **Tenant Determination:**
   - On sign-in: Email domain mapped to tenant
   - Stored in JWT: `token.tenantId`
   - Used for all subsequent API calls

---

## Common Queries

### Get User with Gmail Account

```sql
SELECT 
  u.id, u.email, u.display_name,
  ga.encrypted_refresh_token IS NOT NULL as has_gmail,
  ga.last_sync_at
FROM users u
LEFT JOIN gmail_accounts ga ON ga.user_id = u.id
WHERE u.tenant_id = $1 AND u.email = $2;
```

### Get Threads with Topics and Assignees

```sql
SELECT 
  t.id, t.subject, t.status, t.last_message_ts,
  topic.name as topic_name,
  assignee.display_name as assignee_name
FROM threads t
LEFT JOIN topics topic ON topic.id = t.topic_id
LEFT JOIN users assignee ON assignee.id = t.assignee_id
WHERE t.tenant_id = $1
ORDER BY t.last_message_ts DESC
LIMIT 50;
```

### Get Thread with Messages

```sql
SELECT 
  t.id, t.subject,
  json_agg(
    json_build_object(
      'id', m.id,
      'from_email', m.from_email,
      'snippet', m.snippet,
      'internal_date', m.internal_date
    ) ORDER BY m.internal_date ASC
  ) as messages
FROM threads t
LEFT JOIN messages m ON m.thread_id = t.id
WHERE t.tenant_id = $1 AND t.id = $2
GROUP BY t.id;
```

---

## Migrations

While there are no formal migration files in this repository, schema changes should:

1. Be backwards compatible when possible
2. Use transactions
3. Create indexes concurrently: `CREATE INDEX CONCURRENTLY`
4. Test on a copy of production data first

---

## Performance Considerations

### Indexes

All foreign keys have indexes for join performance:
- `users(tenant_id)`
- `threads(tenant_id, topic_id, assignee_id, status)`
- `messages(thread_id, tenant_id)`
- `gmail_accounts(tenant_id)`
- `audit_logs(tenant_id, actor_user_id)`

### Connection Pooling

- Max connections: 10 (configured in `lib/db.ts`)
- Connections are reused across requests
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

### Query Optimization

- Use `LIMIT` on large tables
- Use indexes for filtering and sorting
- Avoid `SELECT *` (select only needed columns)
- Use JOINs instead of multiple queries where possible

---

## Security

### Data Encryption

- `gmail_accounts.encrypted_refresh_token` - Encrypted OAuth tokens
- `messages.body_enc` - Encrypted message bodies

Uses AES-256-GCM encryption in `lib/tokenVault.ts`.

### PII Handling

- `messages.body_redacted` - Redacted version with PII removed
- `lib/sanitizer.ts` - Removes emails, phones, SSNs, etc.

### Audit Trail

All significant actions logged to `audit_logs`:
- User creation/deletion
- Thread assignments
- Topic changes
- Gmail sync operations

---

## Next Steps

- [Database Setup Guide](./DATABASE_SETUP.md) - How to set up the database
- [Architecture Overview](./ARCHITECTURE.md) - How the application uses this schema
- [API Documentation](./API.md) - API endpoints that query this schema


