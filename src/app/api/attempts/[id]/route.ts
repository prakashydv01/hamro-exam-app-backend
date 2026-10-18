import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { getAttemptResult } from '@/services/attempt.service';

export const GET = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  await connectDB();
  const authUser = getAuthUser(req);
  const result = await getAttemptResult(authUser.userId, params.id);
  return ok(result);
});
