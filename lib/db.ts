import { Pool, PoolClient, QueryResult } from "pg";

// this code creates a single shared pool so that it is reusable.
// then it has a safety wrapper withTenant that handles transactions and sets the tenant ID in order to prevent fucking boilerplate lmao.

// i'm creating a pool because it's wayyyy faster lol. i dont want nextjs to create a new connection for every request.
//
// IMPORTANT (SSL behaviour):
// - Local databases (localhost / 127.0.0.1) use *no SSL*.
// - Any remote database (Supabase / Neon / Railway / cloud Postgres) uses SSL but
//   we turn off certificate validation with `rejectUnauthorized: false`.
//   This avoids "self-signed certificate in certificate chain" errors while
//   still keeping the connection encrypted in transit.
const connectionString = process.env.DATABASE_URL;

const isLocalDb =
  !connectionString ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const ssl = isLocalDb
  ? false
  : { rejectUnauthorized: false }; // Accept provider's certificate (connection still encrypted)

const pool = new Pool({
  connectionString,
  max: 10, // basically the maximum number of connections that can be open at the same time.
  idleTimeoutMillis: 30000, // basically if the connection is idle for 30 seconds, it will be terminated.
  connectionTimeoutMillis: 10000, // basically if the connection takes longer than 10 seconds, it will be terminated.
  ssl,
});

// i'm doing this because i want to make sure that the pool is closed when the server is shutting down. module is cached though, so it doesn't matter much in production.
const cleanup = async () => {
  await pool.end();
};
// this is for local development purposes. since the hosting provider will handle this for us in production.
if (process.env.NODE_ENV !== "production") {
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}


export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // NOTE: Postgres does not allow parameter placeholders in SET statements in the same way
    // it does for normal queries, so we inline the UUID here. tenantId comes from the database
    // and is a UUID, so this is safe.
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    const result = await fn(client); // we execute the query.
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK"); // ACID principles. i want to make sure that the transaction is rolled back if an error occurs.
    throw error;
  } finally {
    client.release();
  }
}

// this is for non-tenant-specific queries.
export async function query(
  sql: string,
  params?: any[]
): Promise<QueryResult> {
  return pool.query(sql, params);
}

export { pool };

