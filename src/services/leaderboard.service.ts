import { LeaderboardScore } from '@/models/Misc';
import { redis } from '@/lib/redis';
// Imported so its schema is registered in this bundle - required for
// populate('userId') to work, since Next.js/Vercel bundles each route as
// its own serverless function and mongoose model registration is per-process.
import '@/models/User';

const LEADERBOARD_CACHE_SECONDS = 5 * 60;

function cacheKey(examId: string) {
  return `leaderboard:${examId}:top50`;
}

/** Only updates if this attempt's score beats the user's previous best for
 * this exam (or it's their first attempt). Ties broken by faster time. */
export async function upsertLeaderboardScore(
  examId: string,
  userId: string,
  score: number,
  actualDuration: number
) {
  const existing = await LeaderboardScore.findOne({ examId, userId });

  if (!existing) {
    await LeaderboardScore.create({
      examId,
      userId,
      bestScore: score,
      bestActualDuration: actualDuration,
      attemptsCount: 1,
    });
  } else {
    const isBetter =
      score > existing.bestScore ||
      (score === existing.bestScore && actualDuration < existing.bestActualDuration);

    existing.attemptsCount += 1;
    if (isBetter) {
      existing.bestScore = score;
      existing.bestActualDuration = actualDuration;
    }
    existing.updatedAt = new Date();
    await existing.save();
  }

  // Invalidate the cached top-50 so the next read recomputes it.
  await redis.del(cacheKey(examId));
}

export async function getLeaderboard(examId: string) {
  const cached = await redis.get<string>(cacheKey(examId));
  if (cached) {
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  }

  const top = await LeaderboardScore.find({ examId })
    .sort({ bestScore: -1, bestActualDuration: 1 })
    .limit(50)
    .populate('userId', 'name')
    .lean();

  const result = top.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId._id.toString(),
    name: (entry.userId as any).name,
    score: entry.bestScore,
    durationSeconds: entry.bestActualDuration,
  }));

  await redis.set(cacheKey(examId), JSON.stringify(result), { ex: LEADERBOARD_CACHE_SECONDS });

  return result;
}

/** "What's my rank" without loading/sorting the whole collection - just
 * counts how many users have a strictly better score. */
export async function getUserRank(examId: string, userId: string) {
  const mine = await LeaderboardScore.findOne({ examId, userId });
  if (!mine) return null;

  const betterCount = await LeaderboardScore.countDocuments({
    examId,
    $or: [
      { bestScore: { $gt: mine.bestScore } },
      { bestScore: mine.bestScore, bestActualDuration: { $lt: mine.bestActualDuration } },
    ],
  });

  return { rank: betterCount + 1, score: mine.bestScore };
}
