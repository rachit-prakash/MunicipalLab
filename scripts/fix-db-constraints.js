const { Pool } = require("pg")
const fs = require("fs")
const path = require("path")

// Load environment variables from .env.local manually
try {
  const envPath = path.resolve(__dirname, "../.env.local")
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8")
    envConfig.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=")
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "") // Remove quotes
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    })
    console.log("Loaded .env.local")
  }
} catch (error) {
  console.warn("Could not load .env.local:", error.message)
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function runMigration() {
  const client = await pool.connect()
  try {
    console.log("Running migration...")
    await client.query("BEGIN")

    // Add unique constraint to threads(gmail_thread_id)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'threads_gmail_thread_id_key'
        ) THEN 
          ALTER TABLE threads ADD CONSTRAINT threads_gmail_thread_id_key UNIQUE (gmail_thread_id);
          RAISE NOTICE 'Added threads_gmail_thread_id_key constraint';
        ELSE
          RAISE NOTICE 'threads_gmail_thread_id_key constraint already exists';
        END IF;
      END $$;
    `)

    // Add unique constraint to messages(gmail_message_id)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'messages_gmail_message_id_key'
        ) THEN 
          ALTER TABLE messages ADD CONSTRAINT messages_gmail_message_id_key UNIQUE (gmail_message_id);
          RAISE NOTICE 'Added messages_gmail_message_id_key constraint';
        ELSE
           RAISE NOTICE 'messages_gmail_message_id_key constraint already exists';
        END IF;
      END $$;
    `)

    await client.query("COMMIT")
    console.log("Migration completed successfully")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
