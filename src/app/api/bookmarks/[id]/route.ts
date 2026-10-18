import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { getAuthUser } from '@/lib/authGuard';
import { Bookmark } from '@/models/Misc';

// [id] here is the questionId, not the bookmark document's own _id - simpler
// for the client, which only ever knows question ids, not bookmark ids.
export const DELETE = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  await connectDB();
  const authUser = getAuthUser(req);

  await Bookmark.deleteOne({ userId: authUser.userId, questionId: params.id });
  return ok({ message: 'Bookmark removed' });
});
