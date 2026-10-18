import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { getLeaderboard, getUserRank } from '@/services/leaderboard.service';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req); // required so we can also return "my rank"
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get('examId');

  if (!examId) return fail('Missing required "examId" query param', 400);

  const [top, myRank] = await Promise.all([
    getLeaderboard(examId),
    getUserRank(examId, authUser.userId),
  ]);

  // Note: `top` is served from a 5-minute Redis cache (see leaderboard.service.ts),
  // `myRank` is computed live via a fast count query - keeps "my rank" accurate
  // even between cache refreshes, without needing to cache per-user.
  return ok({ top, myRank });
});
