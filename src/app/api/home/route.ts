import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import User from '@/models/User';
import Attempt from '@/models/Attempt';
import { Category } from '@/models/Taxonomy';

/**
 * One call for the entire home screen: profile + recent attempts + category
 * list, instead of 3-5 separate round trips. Categories rarely change, so
 * this response is still safe to cache briefly at the edge even though it's
 * per-user (short TTL + the app also has its own React Query cache).
 */
export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);

  const [user, recentAttempts, categories] = await Promise.all([
    User.findById(authUser.userId).select('name email emailVerified'),
    Attempt.find({ userId: authUser.userId, status: { $ne: 'in-progress' } })
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('examId examType score totalQuestions submittedAt')
      .lean(),
    Category.find({ isActive: true }).select('name slug').lean(),
  ]);

  return ok({ user, recentAttempts, categories });
});
