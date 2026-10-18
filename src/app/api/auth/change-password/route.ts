import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { changePasswordSchema, parseOrThrow } from '@/lib/validation';
import { changePassword } from '@/services/auth.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);
  const { currentPassword, newPassword } = parseOrThrow(changePasswordSchema, await req.json());

  await changePassword(authUser.userId, currentPassword, newPassword);

  return ok({ message: 'Password changed successfully' });
});
