import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { resendOtpSchema, parseOrThrow } from '@/lib/validation';
import { resendUserOtp } from '@/services/auth.service';
import { checkRateLimit } from '@/lib/rateLimit';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { userId } = parseOrThrow(resendOtpSchema, await req.json());

  const { success } = await checkRateLimit('otpResend', userId);
  if (!success) {
    return fail('Too many resend requests. Please try again later.', 429, 'RATE_LIMITED');
  }

  await resendUserOtp(userId);
  return ok({ message: 'OTP sent' });
});
