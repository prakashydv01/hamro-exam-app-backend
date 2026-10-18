import { connectDB } from '@/lib/mongodb';
import { ok, fail, withErrorHandling } from '@/lib/apiResponse';
import { Faculty, Category } from '@/models/Taxonomy';

export const GET = withErrorHandling(async (req: Request) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get('category');

  const filter: Record<string, unknown> = { isActive: true };

  if (categorySlug) {
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) return fail('Unknown category', 404, 'CATEGORY_NOT_FOUND');
    filter.categoryId = category._id;
  }

  const faculties = await Faculty.find(filter).select('name slug categoryId').lean();
  return ok(faculties, { cacheSeconds: 60 * 60 * 24 * 30 });
});
