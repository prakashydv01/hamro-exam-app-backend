import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { loginSchema, parseOrThrow } from '@/lib/validation';
import { loginUser } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rateLimit';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { email, password } = parseOrThrow(loginSchema, await req.json());

  // Rate-limit by email to slow down brute-force/credential-stuffing attempts.
  const { success } = await checkRateLimit('login', email);
  if (!success) {
    return fail('Too many login attempts. Please try again later.', 429, 'RATE_LIMITED');
  }

  const tokens = await loginUser(email, password);
  return ok(tokens);
});
