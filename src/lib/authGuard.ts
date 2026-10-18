import { verifyAccessToken, AccessTokenPayload } from './jwt';
import { ApiError } from './apiResponse';

/**
 * Extracts and verifies the Bearer access token from an incoming request.
 * Throws ApiError(401) if missing/invalid/expired - callers should let this
 * bubble up to withErrorHandling rather than catching it themselves.
 *
 * We deliberately do NOT hit the database here - the JWT payload already
 * carries { userId, role, emailVerified }, which is enough for almost every
 * authorization check. This saves a Mongo read on every single request.
 */
export function getAuthUser(req: Request): AccessTokenPayload {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid Authorization header', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    return verifyAccessToken(token);
  } catch {
    throw new ApiError('Access token expired or invalid', 401, 'TOKEN_INVALID');
  }
}

export function requireAdmin(user: AccessTokenPayload) {
  if (user.role !== 'admin') {
    throw new ApiError('Admin access required', 403, 'FORBIDDEN');
  }
}

export function requireVerified(user: AccessTokenPayload) {
  if (!user.emailVerified) {
    throw new ApiError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED');
  }
}
