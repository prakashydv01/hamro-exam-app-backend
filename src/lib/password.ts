import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A lighter hash is fine for short-lived OTPs - they expire in minutes and
// don't need the same work factor as long-lived account passwords.
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 8);
}

export async function compareOtp(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
