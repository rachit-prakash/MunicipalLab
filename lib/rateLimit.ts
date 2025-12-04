import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Rate limiting configuration for different endpoints
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom identifier (defaults to user ID or IP) */
  identifier?: string;
}

/**
 * In-memory rate limit store
 * For production with multiple instances, consider using Redis
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get identifier for rate limiting (user ID or IP address)
 */
async function getIdentifier(
  req: NextRequest,
  config?: RateLimitConfig
): Promise<string> {
  // Use custom identifier if provided
  if (config?.identifier) {
    return config.identifier;
  }

  // Try to get user ID from session
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token?.sub) {
      return `user:${token.sub}`;
    }
  } catch {
    // Fall back to IP if session check fails
  }

  // Fall back to IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/**
 * Check if request should be rate limited
 * @returns null if allowed, or NextResponse with 429 if rate limited
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = await getIdentifier(req, config);
  const key = `${identifier}:${config.windowMs}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null; // Allowed
  }

  if (entry.count >= config.maxRequests) {
    // Rate limited
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${retryAfter} second${retryAfter !== 1 ? "s" : ""}.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = config.maxRequests - entry.count;
  return null; // Allowed, but we could add headers to response later
}

/**
 * Rate limit middleware wrapper
 * Usage: const rateLimit = createRateLimit({ maxRequests: 10, windowMs: 60000 });
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    return checkRateLimit(req, config);
  };
}

/**
 * Predefined rate limit configurations for common endpoints
 */
export const RateLimits = {
  /** Chatbot endpoint: 20 requests per minute */
  CHATBOT: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Sync endpoint: 5 requests per 5 minutes */
  SYNC: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  /** Analysis endpoint: 30 requests per minute */
  ANALYSIS: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Gmail inbox endpoint: 30 requests per minute */
  GMAIL_INBOX: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  /** Policy intelligence endpoint: 20 requests per minute */
  POLICY_INTELLIGENCE: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  /** User export endpoint: 5 requests per 10 minutes (GDPR-sensitive) */
  USER_EXPORT: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  /** Gmail threads endpoint: 50 requests per minute */
  GMAIL_THREADS: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
  /** General API: 100 requests per minute */
  GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

