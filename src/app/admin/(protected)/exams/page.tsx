import { connectDB } from '@/lib/mongodb';
import ExamConfig from '@/models/ExamConfig';
import Question from '@/models/Question';
import { Faculty, Subject } from '@/models/Taxonomy';
import ExamsTabs from './ExamsTabs';

export default async function ExamsPage() {
  await connectDB();

  const [exams, faculties, subjects, chapterAgg] = await Promise.all([
    ExamConfig.find()
      .populate('facultyId', 'name')
      .populate('subjectId', 'name') // practice exams - single subject
      .populate('subjectDistribution.subjectId', 'name') // mock exams - per-subject breakdown
      .sort({ _id: -1 })
      .lean(),
    Faculty.find({ isActive: true }).sort({ name: 1 }).lean(),
    Subject.find({ isActive: true }).sort({ name: 1 }).lean(),
    // Distinct chapters per subject (taken from the questions themselves) with counts.
    Question.aggregate([
      { $match: { isActive: true, chapter: { $nin: [null, ''] } } },
      { $group: { _id: { subjectId: '$subjectId', chapter: '$chapter' }, count: { $sum: 1 } } },
      { $sort: { '_id.chapter': 1 } },
    ]),
  ]);

  const chapterOptions = chapterAgg.map((c: any) => ({
    subjectId: c._id.subjectId.toString() as string,
    chapter: c._id.chapter as string,
    count: c.count as number,
  }));

  const facultyOptions = faculties.map((f: any) => ({ _id: f._id.toString(), name: f.name as string }));
  const subjectOptions = subjects.map((s: any) => ({
    _id: s._id.toString(),
    name: s.name as string,
    facultyId: s.facultyId.toString(),
  }));

  const examRows = exams.map((e: any) => {
    const subjectsLabel =
      e.examType === 'practice'
        ? `${e.subjectId?.name ?? '—'}${e.chapterWise ? ' (chapter-wise)' : ''}`
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
      <p className="muted">Practice exams pull from one subject (optionally chapter-wise); mock exams compose questions across subjects.</p>
      <ExamsTabs exams={examRows} faculties={facultyOptions} subjects={subjectOptions} chapters={chapterOptions} />
    </div>
  );
}