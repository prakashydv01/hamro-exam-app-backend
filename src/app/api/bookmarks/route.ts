import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { bookmarkSchema, parseOrThrow } from '@/lib/validation';
import { Bookmark } from '@/models/Misc';
// Required for populate('questionId') below - see note in leaderboard.service.ts
import '@/models/Question';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);

  const bookmarks = await Bookmark.find({ userId: authUser.userId })
    .populate('questionId', 'question options correctOptionId explanation subjectId')
    .sort({ createdAt: -1 })
    .lean();

  return ok(bookmarks);
});

export const POST = withErrorHandling(async (req: Request) => {
  await connectDB();
  const authUser = getAuthUser(req);
  const { questionId } = parseOrThrow(bookmarkSchema, await req.json());

  try {
    const bookmark = await Bookmark.create({ userId: authUser.userId, questionId });
    return ok(bookmark, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return fail('Question already bookmarked', 409, 'ALREADY_BOOKMARKED');
    }
    throw err;
  }
});
