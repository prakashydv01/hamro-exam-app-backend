import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { refreshSchema, parseOrThrow } from '@/lib/validation';
import { logoutUser } from '@/services/auth.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { refreshToken } = parseOrThrow(refreshSchema, await req.json());
  await logoutUser(refreshToken);
  return ok({ message: 'Logged out' });
});
