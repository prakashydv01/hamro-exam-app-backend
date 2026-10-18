import { connectDB } from '@/lib/mongodb';
import { Faculty, Category } from '@/models/Taxonomy';
import FacultiesTabs from './FacultiesTabs';

export default async function FacultiesPage() {
  await connectDB();
  const [faculties, categories] = await Promise.all([
    Faculty.find().populate('categoryId', 'name').sort({ name: 1 }).lean(),
    Category.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const categoryOptions = categories.map((c: any) => ({ _id: c._id.toString(), name: c.name as string }));
  const facultyRows = faculties.map((f: any) => ({
    _id: f._id.toString(),
    name: f.name as string,
    slug: f.slug as string,
    categoryId: f.categoryId?._id?.toString() ?? '',
    categoryName: (f.categoryId?.name as string) ?? '—',
    isActive: f.isActive as boolean,
  }));

  return (
    <div>
      <h1>Faculties</h1>
      <p className="muted">Programs/exams within a category, e.g. IOE, CSIT, BCA, BIT under Engineering Entrance.</p>
      <FacultiesTabs faculties={facultyRows} categories={categoryOptions} />
    </div>
  );
}
