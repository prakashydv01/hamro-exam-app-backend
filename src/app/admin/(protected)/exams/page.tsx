import { connectDB } from '@/lib/mongodb';
import ExamConfig from '@/models/ExamConfig';
import { Faculty, Subject } from '@/models/Taxonomy';
import ExamsTabs from './ExamsTabs';

export default async function ExamsPage() {
  await connectDB();

  const [exams, faculties, subjects] = await Promise.all([
    ExamConfig.find()
      .populate('facultyId', 'name')
      .populate('subjectId', 'name') // practice exams - single subject
      .populate('subjectDistribution.subjectId', 'name') // mock exams - per-subject breakdown
      .sort({ _id: -1 })
      .lean(),
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
    Subject.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  const facultyOptions = faculties.map((f: any) => ({ _id: f._id.toString(), name: f.name as string }));
  const subjectOptions = subjects.map((s: any) => ({
    _id: s._id.toString(),
    name: s.name as string,
    facultyId: s.facultyId.toString(),
  }));

  const examRows = exams.map((e: any) => {
    const subjectsLabel =
      e.examType === 'practice'
        ? e.subjectId?.name ?? '—'
        : (e.subjectDistribution ?? [])
            .map((sd: any) => `${sd.subjectId?.name ?? '—'} (${sd.count})`)
            .join(', ') || '—';

    return {
      _id: e._id.toString(),
      title: e.title as string,
      facultyName: (e.facultyId?.name as string) ?? '—',
      examType: e.examType as 'practice' | 'mock',
      totalQuestions: e.totalQuestions as number,
      duration: e.duration as number,
      correctMarks: e.correctMarks as number,
      negativeMarks: e.negativeMarks as number,
      isActive: e.isActive as boolean,
      subjectsLabel,
    };
  });

  return (
    <div>
      <h1>Exams</h1>
      <p className="muted">Practice exams pull from one subject; mock exams compose questions across subjects.</p>
      <ExamsTabs exams={examRows} faculties={facultyOptions} subjects={subjectOptions} />
    </div>
  );
}