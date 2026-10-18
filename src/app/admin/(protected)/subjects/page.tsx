import { connectDB } from '@/lib/mongodb';
import { Subject, Faculty } from '@/models/Taxonomy';
import SubjectsTabs from './SubjectsTabs';

export default async function SubjectsPage() {
  await connectDB();
  const [subjects, faculties] = await Promise.all([
    Subject.find().populate('facultyId', 'name').sort({ name: 1 }).lean(),
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const subjectRows = subjects.map((s: any) => ({
    _id: s._id.toString(),
    name: s.name as string,
    slug: s.slug as string,
    facultyId: s.facultyId?._id?.toString() ?? '',
    facultyName: (s.facultyId?.name as string) ?? '—',
    isActive: s.isActive as boolean,
  }));
  const facultyOptions = faculties.map((f: any) => ({ _id: f._id.toString(), name: f.name as string }));

  return (
    <div>
      <h1>Subjects</h1>
      <p className="muted">Subjects within a faculty, e.g. Physics, Mathematics, English under IOE.</p>
      <SubjectsTabs subjects={subjectRows} faculties={facultyOptions} />
    </div>
  );
}
