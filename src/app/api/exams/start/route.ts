import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser, requireVerified } from '@/lib/authGuard';
import { startExamSchema, parseOrThrow } from '@/lib/validation';
import { startExam } from '@/services/exam.service';

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);
  requireVerified(authUser);

  const { examId } = parseOrThrow(startExamSchema, await req.json());
  const result = await startExam(authUser.userId, examId);

  // This single response contains everything the app needs to run the
  // entire exam locally - no further API calls until submit.
  return ok(result);
});
