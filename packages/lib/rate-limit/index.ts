import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryRateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      const entry = this.store[key];
      if (entry && entry.resetTime < now) {
        delete this.store[key];
      }
    }
  }

  async isAllowed(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    if (!this.store[identifier] || this.store[identifier].resetTime < now) {
      this.store[identifier] = {
        count: 1,
        resetTime
      };
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime
      };
    }

    this.store[identifier].count++;
    
    const allowed = this.store[identifier].count <= limit;
    const remaining = Math.max(0, limit - this.store[identifier].count);
    
    return {
      allowed,
      remaining,
      resetTime: this.store[identifier].resetTime
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

const globalRateLimiter = new InMemoryRateLimiter();

export function createRateLimiter(limit: number, windowMs: number) {
  return async (request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    identifier: string;
  }> => {
    const ip = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const identifier = `${ip}:${userAgent}`;
    
    const result = await globalRateLimiter.isAllowed(identifier, limit, windowMs);
    
    return {
      ...result,
      identifier
    };
  };
}

export const authRateLimit = createRateLimiter(5, 60 * 1000);

export const generalRateLimit = createRateLimiter(100, 60 * 1000);

export const sensitiveRateLimit = createRateLimiter(10, 60 * 1000);

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || "unknown";
}

export async function withRateLimit<T>(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  request: NextRequest,
  handler: () => Promise<T>
): Promise<T | Response> {
  const result = await rateLimiter(request);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        resetTime: result.resetTime
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }
  
  return handler();
}