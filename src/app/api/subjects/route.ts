import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { Subject, Faculty } from '@/models/Taxonomy';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const facultySlug = searchParams.get('faculty');

  if (!facultySlug) return fail('Missing required "faculty" query param', 400);

  const faculty = await Faculty.findOne({ slug: facultySlug });
  if (!faculty) return fail('Unknown faculty', 404, 'FACULTY_NOT_FOUND');

  const subjects = await Subject.find({ facultyId: faculty._id, isActive: true })
    .select('name slug facultyId')
    .lean();

  return ok(subjects, { cacheSeconds: 60 * 60 * 24 * 30 });
});
