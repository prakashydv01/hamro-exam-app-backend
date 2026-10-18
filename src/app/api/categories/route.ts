import { connectDB } from '@/lib/mongodb';
import { ok, withErrorHandling } from '@/lib/apiResponse';
import { Category } from '@/models/Taxonomy';

// Static reference data - cached at the edge for 30 days. No Redis needed;
// HTTP Cache-Control is free and this data changes rarely (admin-driven only).
export const GET = withErrorHandling(async () => {
  await connectDB();
  const categories = await Category.find({ isActive: true }).select('name slug').lean();
  return ok(categories, { cacheSeconds: 60 * 60 * 24 * 30 });
});
