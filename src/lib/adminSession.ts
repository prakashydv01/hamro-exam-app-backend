import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_SESSION_COOKIE = 'admin_session';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET as string;
const SESSION_DURATION = '8h';

if (!ADMIN_SESSION_SECRET) {
  throw new Error('Missing ADMIN_SESSION_SECRET environment variable');
}

export interface AdminSessionPayload {
  userId: string;
  name: string;
  email: string;
}

/**
 * This is intentionally a *separate* auth system from the mobile app's JWT
 * flow (src/lib/jwt.ts + authGuard.ts). The dashboard runs in a browser, so
 * a plain httpOnly session cookie is simpler and safer here than reusing
 * bearer-token auth designed for a native client.
 */
export function signAdminSession(payload: AdminSessionPayload): string {
  return jwt.sign(payload, ADMIN_SESSION_SECRET, { expiresIn: SESSION_DURATION });
}

export function setAdminSessionCookie(token: string) {
  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
}

export function clearAdminSessionCookie() {
  cookies().delete(ADMIN_SESSION_COOKIE);
}

export function getAdminSession(): AdminSessionPayload | null {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, ADMIN_SESSION_SECRET) as AdminSessionPayload;
  } catch {
    return null;
  }
}

/** Call at the top of any protected server component/layout. Redirects to
 * the login page if there's no valid session - nothing renders past this. */
export function requireAdminSession(): AdminSessionPayload {
  const session = getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}
