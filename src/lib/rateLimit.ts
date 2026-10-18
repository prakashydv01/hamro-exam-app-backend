import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// A small set of named limiters, each with its own bucket - reused across
// invocations rather than constructed per-request.
const limiters = {
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 attempts / min per key
    prefix: 'ratelimit:login',
  }),
  otpResend: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 resends / hour per user
    prefix: 'ratelimit:otp-resend',
  }),
  submit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 submissions / min per user
    prefix: 'ratelimit:submit',
  }),
  // Add this entry into the existing `limiters` object in src/lib/rateLimit.ts,
// alongside login/otpResend/submit:

  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 reset requests / hour per email
    prefix: 'ratelimit:password-reset',
  }),
};


export type LimiterName = keyof typeof limiters;

/**
 * Checks a rate limit for the given key. Returns { success, remaining }.
 * Caller decides what to do on failure (typically a 429 response).
 */
export async function checkRateLimit(name: LimiterName, key: string) {
  const { success, remaining, reset } = await limiters[name].limit(key);
  return { success, remaining, reset };
}
