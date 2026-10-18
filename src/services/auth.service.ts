import { nanoid } from 'nanoid';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import { hashPassword, comparePassword } from '@/lib/password';
import { issueOtp, verifyOtp as checkOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/email';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';
import { ApiError } from '@/lib/apiResponse';
import {sendPasswordResetEmail} from '@/lib/email';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ $or: [{ email: input.email }, { phone: input.phone }] });
  if (existing) {
    throw new ApiError('An account with this email or phone already exists', 409, 'USER_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    emailVerified: false,
  });

  const otp = await issueOtp(user.id);
  await sendOtpEmail(user.email, otp);

  return { userId: user.id };
}

export async function verifyUserOtp(userId: string, otp: string) {
  const result = await checkOtp(userId, otp);

  if (result === 'EXPIRED_OR_MISSING') {
    throw new ApiError('Code expired. Please request a new one.', 400, 'OTP_EXPIRED');
  }
  if (result === 'LOCKED') {
    throw new ApiError('Too many incorrect attempts. Please request a new code.', 429, 'OTP_LOCKED');
  }
  if (result === 'INVALID') {
    throw new ApiError('Incorrect code. Please try again.', 400, 'OTP_INVALID');
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  user.emailVerified = true;
  await user.save();

  return issueTokenPair(user.id, user.role, true);
}

export async function resendUserOtp(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
  if (user.emailVerified) throw new ApiError('Email already verified', 400, 'ALREADY_VERIFIED');

  try {
    const otp = await issueOtp(userId);
    await sendOtpEmail(user.email, otp);
  } catch (err: any) {
    if (err.message === 'RESEND_COOLDOWN') {
      throw new ApiError('Please wait before requesting another code', 429, 'OTP_COOLDOWN');
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  if (!user.emailVerified) {
    // Specific code so the app can route straight to the OTP screen
    // instead of showing a generic login error.
    throw new ApiError('Please verify your email to continue', 403, 'EMAIL_NOT_VERIFIED');
  }

  return issueTokenPair(user.id, user.role, user.emailVerified);
}

async function issueTokenPair(userId: string, role: 'user' | 'admin', emailVerified: boolean) {
  const accessToken = signAccessToken({ userId, role, emailVerified });

  const jti = nanoid();
  const refreshToken = signRefreshToken({ userId, jti });
  const tokenHash = await hashPassword(refreshToken); // reuse bcrypt hashing for token storage

  await RefreshToken.create({
    userId,
    jti,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError('Refresh token expired or invalid', 401, 'REFRESH_INVALID');
  }

  const stored = await RefreshToken.findOne({ jti: payload.jti, userId: payload.userId });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new ApiError('Refresh token expired or revoked', 401, 'REFRESH_INVALID');
  }

  const matches = await comparePassword(refreshToken, stored.tokenHash);
  if (!matches) {
    throw new ApiError('Refresh token expired or invalid', 401, 'REFRESH_INVALID');
  }

  const user = await User.findById(payload.userId);
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  // Rotate: revoke the old refresh token, issue a brand new pair.
  stored.revoked = true;
  await stored.save();

  return issueTokenPair(user.id, user.role, user.emailVerified);
}

export async function logoutUser(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await RefreshToken.updateOne({ jti: payload.jti }, { revoked: true });
  } catch {
    // Already invalid/expired - logout is a no-op in that case, not an error.
  }
}
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  const matches = await comparePassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw new ApiError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

/**
 * Forgot-password step 1: request a reset code by email.
 *
 * Deliberately keyed by `reset:${email}` (a separate OTP namespace from
 * registration's userId-keyed OTPs) and always returns the same generic
 * response regardless of whether the email exists - this avoids leaking
 * which emails are registered (unlike /api/auth/register, which already
 * reveals this via its USER_EXISTS error; that's an existing, accepted
 * tradeoff there, but forgot-password is a more sensitive surface to leak
 * on since it's unauthenticated and specifically about account recovery).
 */
export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email });

  if (user) {
    const otp = await issueOtp(`reset:${email}`);
    await sendPasswordResetEmail(email, otp);
  }
  // No else branch - silence is the point. Same response either way.
}

/** Forgot-password step 2: verify the code and set a new password.
 * Revokes ALL existing refresh tokens for this user (forces re-login on
 * every device) - unlike changePassword above, this is a recovery flow
 * triggered from a logged-out state, so we can't assume the requester is
 * necessarily the legitimate owner of any existing session; the safer
 * default is to kill every session and require a fresh login with the
 * new password. */
export async function resetPassword(email: string, otp: string, newPassword: string) {
  const result = await checkOtp(`reset:${email}`, otp);

  if (result === 'EXPIRED_OR_MISSING') {
    throw new ApiError('Code expired. Please request a new one.', 400, 'OTP_EXPIRED');
  }
  if (result === 'LOCKED') {
    throw new ApiError('Too many incorrect attempts. Please request a new code.', 429, 'OTP_LOCKED');
  }
  if (result === 'INVALID') {
    throw new ApiError('Incorrect code. Please try again.', 400, 'OTP_INVALID');
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await RefreshToken.updateMany({ userId: user.id }, { revoked: true });
}
