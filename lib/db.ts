import { Pool, PoolClient, QueryResult } from "pg";

// Singleton pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle graceful shutdown in development
const cleanup = async () => {
  await pool.end();
};

if (process.env.NODE_ENV !== "production") {
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

/**
 * Execute a query within a tenant context.
 * Automatically handles transaction begin/commit/rollback and sets tenant ID.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL app.tenant_id = $1", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query without tenant context.
 * Convenience method for non-tenant-specific queries.
 */
export async function query(
  sql: string,
  params?: any[]
): Promise<QueryResult> {
  return pool.query(sql, params);
}

export { pool };

