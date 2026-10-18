import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { submitExamSchema, parseOrThrow } from '@/lib/validation';
import { submitAttempt } from '@/services/attempt.service';
import { checkRateLimit } from '@/lib/rateLimit';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);

  const { success } = await checkRateLimit('submit', authUser.userId);
  if (!success) {
    return fail('Too many submissions. Please slow down.', 429, 'RATE_LIMITED');
  }

  const { attemptId, answers } = parseOrThrow(submitExamSchema, await req.json());
  const result = await submitAttempt(authUser.userId, attemptId, answers);

  return ok(result);
});
