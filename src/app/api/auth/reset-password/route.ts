import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { resetPasswordSchema, parseOrThrow } from '@/lib/validation';
import { resetPassword } from '@/services/auth.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { email, otp, newPassword } = parseOrThrow(resetPasswordSchema, await req.json());

  await resetPassword(email, otp, newPassword);

  return ok({ message: 'Password reset successfully. Please log in with your new password.' });
});
