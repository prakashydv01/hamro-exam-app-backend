import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import ExamConfig from '@/models/ExamConfig';
import { Faculty } from '@/models/Taxonomy';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const facultySlug = searchParams.get('faculty');
  const examType = searchParams.get('type'); // 'practice' | 'mock' | null (both)

  if (!facultySlug) return fail('Missing required "faculty" query param', 400);

  const faculty = await Faculty.findOne({ slug: facultySlug });
  if (!faculty) return fail('Unknown faculty', 404, 'FACULTY_NOT_FOUND');

  const filter: Record<string, unknown> = { facultyId: faculty._id, isActive: true };
  if (examType === 'practice' || examType === 'mock') filter.examType = examType;

  // Don't leak subjectDistribution/correctMarks internals unnecessarily,
  // but they're not sensitive - safe to include for the app to render
  // "25 Physics, 25 Math..." on the exam detail screen before starting.
  // subjectId is populated (practice exams only) so the app can list/start
  // practice directly by subject name without a separate lookup.
  const exams = await ExamConfig.find(filter)
    .select('title examType duration totalQuestions correctMarks negativeMarks subjectDistribution subjectId')
    .populate('subjectId', 'name')
    .lean();

  return ok(exams, { cacheSeconds: 60 * 60 * 24 }); // 24h
});