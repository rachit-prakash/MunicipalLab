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
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "")
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

    // Add timezone column to users table if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'timezone'
        ) THEN 
          ALTER TABLE users ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';
          RAISE NOTICE 'Added timezone column to users table';
        ELSE
          RAISE NOTICE 'timezone column already exists in users table';
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



