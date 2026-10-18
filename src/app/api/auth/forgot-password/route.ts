import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { forgotPasswordSchema, parseOrThrow } from '@/lib/validation';
import { requestPasswordReset } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rateLimit';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { email } = parseOrThrow(forgotPasswordSchema, await req.json());

  const { success } = await checkRateLimit('passwordReset', email);
  if (!success) {
    return fail('Too many reset requests. Please try again later.', 429, 'RATE_LIMITED');
  }

  await requestPasswordReset(email);

  // Same response whether or not the email exists - see requestPasswordReset
  // in auth.service.ts for why.
  return ok({ message: 'If an account exists for this email, a reset code has been sent.' });
});
