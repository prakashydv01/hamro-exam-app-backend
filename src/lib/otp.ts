import { redis } from './redis';
import { hashOtp, compareOtp } from './password';

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

interface OtpRecord {
  codeHash: string;
  attempts: number;
}

function otpKey(userId: string) {
  return `otp:${userId}`;
}

function cooldownKey(userId: string) {
  return `otp:cooldown:${userId}`;
}

export function generateOtp(): string {
  // 6-digit numeric OTP, zero-padded
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Stores a freshly generated OTP for a user, overwriting any previous one.
 * Returns the plaintext code so the caller can email it - only the hash
 * is ever persisted.
 */
export async function issueOtp(userId: string): Promise<string> {
  const onCooldown = await redis.get(cooldownKey(userId));
  if (onCooldown) {
    throw new Error('RESEND_COOLDOWN');
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const record: OtpRecord = { codeHash, attempts: 0 };

  await redis.set(otpKey(userId), JSON.stringify(record), { ex: OTP_TTL_SECONDS });
  await redis.set(cooldownKey(userId), '1', { ex: RESEND_COOLDOWN_SECONDS });

  return code;
}

export type OtpVerifyResult = 'OK' | 'EXPIRED_OR_MISSING' | 'INVALID' | 'LOCKED';

export async function verifyOtp(userId: string, code: string): Promise<OtpVerifyResult> {
  const raw = await redis.get<string>(otpKey(userId));
  if (!raw) return 'EXPIRED_OR_MISSING';

  const record: OtpRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey(userId));
    return 'LOCKED';
  }

  const isMatch = await compareOtp(code, record.codeHash);

  if (!isMatch) {
    record.attempts += 1;
    // keep remaining TTL roughly intact rather than resetting the clock
    const ttl = await redis.ttl(otpKey(userId));
    await redis.set(otpKey(userId), JSON.stringify(record), { ex: ttl > 0 ? ttl : OTP_TTL_SECONDS });
    return 'INVALID';
  }

  await redis.del(otpKey(userId));
  return 'OK';
}
