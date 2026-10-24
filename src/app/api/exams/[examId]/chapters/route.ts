import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import ExamConfig from '@/models/ExamConfig';
import Question from '@/models/Question';

/**
 * Chapters available for a chapter-wise practice exam: the distinct
 * `chapter` values of the exam's subject (from the questions themselves),
 * with how many active questions each has.
 */
export const GET = withErrorHandling(async (_req: Request, ctx: { params: { examId: string } }) => {
  await connectDB();
  const { examId } = ctx.params;
  if (!Types.ObjectId.isValid(examId)) return fail('Invalid exam id', 400);

  const exam = (await ExamConfig.findOne({ _id: examId, isActive: true })
    .select('subjectId examType')
    .lean()) as { subjectId: Types.ObjectId; examType: string } | null;
  if (!exam || exam.examType !== 'practice' || !exam.subjectId) return fail('Exam not found', 404, 'EXAM_NOT_FOUND');

  const rows = await Question.aggregate([
    { $match: { subjectId: exam.subjectId, isActive: true, chapter: { $nin: [null, ''] } } },
    { $group: { _id: '$chapter', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return ok(
    rows.map((r: any) => ({ chapter: r._id as string, count: r.count as number })),
    { cacheSeconds: 60 * 10 }
  );
});