/**
 * Migration Script: Re-sync Message Bodies from Gmail
 *
 * This script re-fetches message bodies from Gmail to fix truncated/partial
 * content caused by the previous extractBody function not handling nested
 * multipart MIME structures.
 *
 * Usage:
 *   pnpm exec dotenv -e .env.local -- npx tsx scripts/migrations/resync-message-bodies.ts
 *
 * Options:
 *   --dry-run    Preview changes without updating the database
 *   --limit=N    Process only N messages (default: all)
 *   --tenant=ID  Process only a specific tenant
 */

import { Pool } from "pg";
import { createDecipheriv } from "node:crypto";

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const isLocalDb =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  max: 5,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

// Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  process.exit(1);
}

// Token vault for decrypting refresh tokens (inlined from lib/tokenVault.ts)
const KEY_ENV_VAR = "TOKEN_VAULT_KEY";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const EXPECTED_KEY_LENGTH = 32;

let cachedKey: Buffer | null = null;

function getVaultKey(): Buffer {
  if (cachedKey) return cachedKey;

  const rawKey = process.env[KEY_ENV_VAR];
  if (!rawKey) {
    throw new Error(`Environment variable ${KEY_ENV_VAR} is required.`);
  }

  const decoded = Buffer.from(rawKey, "base64");
  if (decoded.length !== EXPECTED_KEY_LENGTH) {
    throw new Error(`${KEY_ENV_VAR} must decode to ${EXPECTED_KEY_LENGTH} bytes.`);
  }

  cachedKey = decoded;
  return cachedKey;
}

function openToken(blob: Buffer): string {
  if (!Buffer.isBuffer(blob)) {
    throw new Error("openToken expects a Buffer.");
  }

  if (blob.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Malformed payload (too short).");
  }

  const key = getVaultKey();
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

// Validate vault key early
getVaultKey();

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
const tenantArg = args.find((a) => a.startsWith("--tenant="));
const tenantFilter = tenantArg ? tenantArg.split("=")[1] : null;

// PII redaction (copied from lib/sanitizer.ts)
function redactPII(text: string): string {
  if (!text) return text;
  let redacted = text;
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[redacted]"
  );
  redacted = redacted.replace(
    /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    "[redacted]"
  );
  redacted = redacted.replace(
    /\b\d+\s+([\w\s]+\s+)?(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir|Parkway|Pkwy|Terrace|Ter)\b/gi,
    "[redacted]"
  );
  return redacted;
}

// Gmail uses base64url encoding (RFC 4648), not standard base64
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

// Find a part by its MIME type (returns the part object, not decoded content)
function findPartByMimeType(parts: any[], mimeType: string): any | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPartByMimeType(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

// Get the largest text part of a specific type from a parts array
function getLargestTextPart(parts: any[], mimeType: string): string | null {
  const matching = parts.filter((p) => p.mimeType === mimeType && p.body?.data);
  if (matching.length === 0) return null;
  const largest = matching.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
  return decodeBase64Url(largest.body.data);
}

// Recursively collect ALL parts of a specific MIME type
function collectAllParts(parts: any[], mimeType: string): any[] {
  let results: any[] = [];
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) results.push(part);
    if (part.parts) results = results.concat(collectAllParts(part.parts, mimeType));
  }
  return results;
}

// Extract body - prioritize multipart/alternative content and largest parts
function extractBody(payload: any): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (!payload.parts) return "";

  // Step 1: Look for multipart/alternative (contains the actual message body)
  const alternativePart = findPartByMimeType(payload.parts, "multipart/alternative");
  if (alternativePart?.parts) {
    const htmlFromAlt = getLargestTextPart(alternativePart.parts, "text/html");
    if (htmlFromAlt) return htmlFromAlt;
    const plainFromAlt = getLargestTextPart(alternativePart.parts, "text/plain");
    if (plainFromAlt) return plainFromAlt;
  }

  // Step 2: Check multipart/related (often wraps multipart/alternative)
  const relatedPart = findPartByMimeType(payload.parts, "multipart/related");
  if (relatedPart?.parts) {
    const altInRelated = findPartByMimeType(relatedPart.parts, "multipart/alternative");
    if (altInRelated?.parts) {
      const htmlFromAlt = getLargestTextPart(altInRelated.parts, "text/html");
      if (htmlFromAlt) return htmlFromAlt;
      const plainFromAlt = getLargestTextPart(altInRelated.parts, "text/plain");
      if (plainFromAlt) return plainFromAlt;
    }
    const htmlFromRelated = getLargestTextPart(relatedPart.parts, "text/html");
    if (htmlFromRelated) return htmlFromRelated;
    const plainFromRelated = getLargestTextPart(relatedPart.parts, "text/plain");
    if (plainFromRelated) return plainFromRelated;
  }

  // Step 3: Fallback - collect ALL text parts and return the largest
  const allHtmlParts = collectAllParts(payload.parts, "text/html");
  if (allHtmlParts.length > 0) {
    const largest = allHtmlParts.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
    if (largest.body?.data) return decodeBase64Url(largest.body.data);
  }

  const allPlainParts = collectAllParts(payload.parts, "text/plain");
  if (allPlainParts.length > 0) {
    const largest = allPlainParts.sort((a, b) => (b.body?.size || 0) - (a.body?.size || 0))[0];
    if (largest.body?.data) return decodeBase64Url(largest.body.data);
  }

  return "";
}

// Token management
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(tenantId: string, userId: string, encryptedRefreshToken: Buffer): Promise<string> {
  const cacheKey = `${tenantId}:${userId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const refreshToken = openToken(encryptedRefreshToken);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`Token refresh failed: ${payload.error || "unknown"}`);
  }

  const expiresAt = Date.now() + (payload.expires_in - 60) * 1000;
  tokenCache.set(cacheKey, { token: payload.access_token, expiresAt });

  return payload.access_token;
}

// Fetch message from Gmail
async function fetchGmailMessage(accessToken: string, messageId: string): Promise<any> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  return response.json();
}

// Main migration
async function migrate() {
  console.log("=".repeat(60));
  console.log("Message Body Re-sync Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  if (limit) console.log(`Limit: ${limit} messages`);
  if (tenantFilter) console.log(`Tenant filter: ${tenantFilter}`);
  console.log("");

  // Get all gmail accounts
  let accountsQuery = `
    SELECT ga.tenant_id, ga.user_id, ga.email, ga.encrypted_refresh_token
    FROM gmail_accounts ga
    WHERE ga.encrypted_refresh_token IS NOT NULL
  `;
  const accountParams: any[] = [];

  if (tenantFilter) {
    accountsQuery += ` AND ga.tenant_id = $1`;
    accountParams.push(tenantFilter);
  }

  const accountsResult = await pool.query(accountsQuery, accountParams);
  console.log(`Found ${accountsResult.rows.length} Gmail account(s)\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const account of accountsResult.rows) {
    const { tenant_id, user_id, email, encrypted_refresh_token } = account;
    console.log(`\nProcessing account: ${email} (tenant: ${tenant_id})`);

    try {
      // Get access token
      const encryptedBuffer = Buffer.isBuffer(encrypted_refresh_token)
        ? encrypted_refresh_token
        : Buffer.from(encrypted_refresh_token, "base64");

      const accessToken = await getAccessToken(tenant_id, user_id, encryptedBuffer);

      // Get messages for this tenant
      let messagesQuery = `
        SELECT m.id, m.gmail_message_id, m.body_redacted, LENGTH(m.body_redacted) as body_length
        FROM messages m
        WHERE m.tenant_id = $1
        ORDER BY m.internal_date DESC
      `;
      const msgParams: any[] = [tenant_id];

      if (limit) {
        messagesQuery += ` LIMIT $2`;
        msgParams.push(limit - totalProcessed);
      }

      const messagesResult = await pool.query(messagesQuery, msgParams);
      console.log(`  Found ${messagesResult.rows.length} message(s)`);

      for (const msg of messagesResult.rows) {
        if (limit && totalProcessed >= limit) break;

        totalProcessed++;
        const { id, gmail_message_id, body_redacted, body_length } = msg;

        try {
          // Fetch from Gmail
          const gmailMessage = await fetchGmailMessage(accessToken, gmail_message_id);
          const newBody = extractBody(gmailMessage.payload);
          const newBodyRedacted = redactPII(newBody);

          const oldLength = body_length || 0;
          const newLength = newBodyRedacted.length;
          const improved = newLength > oldLength;

          if (improved) {
            console.log(
              `  [${totalProcessed}] ${gmail_message_id}: ${oldLength} -> ${newLength} chars (+${newLength - oldLength})`
            );

            if (!dryRun) {
              await pool.query(
                `UPDATE messages SET body_redacted = $1 WHERE id = $2`,
                [newBodyRedacted, id]
              );
            }
            totalUpdated++;
          } else {
            // No improvement, skip
            process.stdout.write(".");
          }
        } catch (msgError: any) {
          console.log(`  [${totalProcessed}] ${gmail_message_id}: ERROR - ${msgError.message}`);
          totalErrors++;
        }

        // Rate limiting - Gmail API allows 250 queries per second per user
        await new Promise((r) => setTimeout(r, 50));
      }

      if (limit && totalProcessed >= limit) break;
    } catch (accountError: any) {
      console.log(`  ERROR: ${accountError.message}`);
      totalErrors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Migration Complete");
  console.log("=".repeat(60));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total updated:   ${totalUpdated}`);
  console.log(`Total errors:    ${totalErrors}`);
  if (dryRun) {
    console.log("\nThis was a DRY RUN. No changes were made.");
    console.log("Run without --dry-run to apply changes.");
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
