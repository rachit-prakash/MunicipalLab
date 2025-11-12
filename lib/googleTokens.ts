import { withTenant } from "@/lib/db";
import { open } from "@/lib/tokenVault";

// what does this file do?
// simple really. haha.

// its 2AM my sleep schedule is fucked.
// fuck my life.

// anyways. this file gives us a fresh access token based on the tenantID and userID.
// since we use caching, it is very fast and safe due to encryption and safety window.

// this is the cache entry for the access token.
type CacheEntry = {
  token: string; // the access token.
  expiresAt: number; // the expiration time of the access token.
};

// this is the response from the Google OAuth token endpoint.
interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string; // for the vibe-coders, who keep asking me what the fuck the question mark stands for. it is basically optional. like if it doesnt exist, its ok! no errors!
  scope?: string;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
  [key: string]: unknown; // square brackets stand for the index signature. if google is extra-fucking-verbose, it will return other stuff like error_description and error. we just politely ignore it.
}

// stop calling my code fucking boilerplate. its not boilerplate. its optimized for performance and security.

const tokenCache = new Map<string, CacheEntry>(); // yeah this is exactly why i do leetcode. i actually use hashmaps! we want less time complexity and more performance, so we use look ups that are stored in memory.
const SAFETY_WINDOW_SECONDS = 60; // basically I dont wanna deal with clock drift and network latency, so i just add a safety window.

export async function getAccessToken(tenantId: string, userId: string): Promise<string> {
  if (!tenantId || !userId) {
    throw new Error("getAccessToken requires both tenantId and userId."); // i want to make sure that the tenantId and userId are valid.
  }

  const cacheKey = `${tenantId}:${userId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  // if you haven't noticed by now. im obsessed with caching. if the token is expired
  // we load the refresh token from the database and use it to refresh the access token.

  const { clientId, clientSecret, refreshToken } = await loadRefreshToken(tenantId, userId);

  const { access_token, expires_in } = await requestAccessToken({
    clientId,
    clientSecret,
    refreshToken,
    tenantId,
    userId,
  });

  const ttlSeconds = Math.max(0, Number(expires_in) - SAFETY_WINDOW_SECONDS);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  tokenCache.set(cacheKey, { token: access_token, expiresAt });

  return access_token;
}

async function loadRefreshToken(
  tenantId: string,
  userId: string
): Promise<{ clientId: string; clientSecret: string; refreshToken: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const row = await withTenant(tenantId, async (client) => {
    const result = await client.query<{ encrypted_refresh_token: unknown }>(
      `SELECT encrypted_refresh_token FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0];
  });

  if (!row || row.encrypted_refresh_token == null) {
    throw new Error(`No Gmail account refresh token is stored for user ${userId} in tenant ${tenantId}.`);
  }

  const encrypted = normalizeToBuffer(row.encrypted_refresh_token);

  let refreshToken: string;
  try {
    refreshToken = open(encrypted);
  } catch (error) {
    throw new Error(`Unable to decrypt refresh token for user ${userId} in tenant ${tenantId}.`);
  }

  if (!refreshToken) {
    throw new Error(`Decrypted refresh token is empty for user ${userId} in tenant ${tenantId}.`);
  }

  return { clientId, clientSecret, refreshToken };
}

async function requestAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId: string;
  userId: string;
}): Promise<OAuthTokenResponse> {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Request to Google token endpoint failed for tenant ${params.tenantId}, user ${params.userId}: ${message}.`
    );
  }

  let payload: OAuthTokenResponse;
  try {
    payload = (await response.json()) as OAuthTokenResponse;
  } catch (error) {
    throw new Error(`Google token endpoint returned invalid JSON for tenant ${params.tenantId}, user ${params.userId}.`);
  }

  if (!response.ok) {
    const errorDescription =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.error_description === "string"
        ? payload.error_description
        : "unknown_error";

    throw new Error(
      `Google token refresh failed for tenant ${params.tenantId}, user ${params.userId} (status ${response.status}: ${errorDescription}).`
    );
  }

  if (!payload.access_token) {
    throw new Error(`Google token response missing access_token for tenant ${params.tenantId}, user ${params.userId}.`);
  }

  if (typeof payload.expires_in !== "number" || Number.isNaN(payload.expires_in)) {
    throw new Error(
      `Google token response missing valid expires_in for tenant ${params.tenantId}, user ${params.userId}.`
    );
  }

  return payload;
}

function normalizeToBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      return Buffer.from(value, "base64");
    } catch (error) {
      throw new Error("Encrypted refresh token is not valid base64.");
    }
  }

  throw new Error("Encrypted refresh token is stored in an unsupported format.");
}


