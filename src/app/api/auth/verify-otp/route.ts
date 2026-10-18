import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { verifyOtpSchema, parseOrThrow } from '@/lib/validation';
import { verifyUserOtp } from '@/services/auth.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { userId, otp } = parseOrThrow(verifyOtpSchema, await req.json());
  const tokens = await verifyUserOtp(userId, otp);
  return ok(tokens);
});
