import { connectDB } from '@/lib/mongodb';
import { Category } from '@/models/Taxonomy';
import CategoriesTabs from './CategoriesTabs';

export default async function CategoriesPage() {
  await connectDB();
  const categories = await Category.find().sort({ name: 1 }).lean();

  const categoryRows = categories.map((c: any) => ({
    _id: c._id.toString(),
    name: c.name as string,
    slug: c.slug as string,
    isActive: c.isActive as boolean,
  }));

  return (
    <div>
      <h1>Categories</h1>
      <p className="muted">Top-level exam types, e.g. Engineering Entrance, Loksewa, SEE, +2 Entrance.</p>
      <CategoriesTabs categories={categoryRows} />
    </div>
  );
}
