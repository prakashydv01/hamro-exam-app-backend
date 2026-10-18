import { Redis } from '@upstash/redis';

// Used for: OTP storage (self-expiring via TTL), leaderboard caching,
// and rate-limit counters. Nothing else needs Redis in this architecture -
// static reference data (categories/faculties/subjects) is cached via HTTP
// Cache-Control headers instead, which costs nothing.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});
