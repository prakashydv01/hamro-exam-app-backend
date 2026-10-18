import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import User from '@/models/User';
import { ApiError } from '@/lib/apiResponse';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);

  const user = await User.findById(authUser.userId).select('name email phone emailVerified role createdAt');
  if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

  return ok(user);
});
