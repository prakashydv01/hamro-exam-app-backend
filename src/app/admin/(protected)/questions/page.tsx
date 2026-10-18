import { connectDB } from '@/lib/mongodb';
import Question from '@/models/Question';
import { Faculty, Subject } from '@/models/Taxonomy';
import QuestionsTabs from './QuestionsTabs';

interface Props {
  searchParams: { facultyId?: string; subjectId?: string };
}

export default async function QuestionsPage({ searchParams }: Props) {
  await connectDB();

  const faculties = await Faculty.find({ isActive: true }).sort({ name: 1 }).lean();
  const activeFacultyId = searchParams.facultyId || faculties[0]?._id.toString();

  const subjects = activeFacultyId
    ? await Subject.find({ facultyId: activeFacultyId, isActive: true }).sort({ name: 1 }).lean()
    : [];
  const activeSubjectId = searchParams.subjectId || subjects[0]?._id.toString();

  const questions = activeSubjectId
    ? await Question.find({ subjectId: activeSubjectId }).sort({ createdAt: -1 }).limit(100).lean()
    : [];

  if (faculties.length === 0) {
    return (
      <div>
        <h1>Questions</h1>
        <p className="muted">Add a faculty and subject first.</p>
      </div>
    );
  }

  // Server Components can only pass plain serializable data across to
  // Client Components - Mongoose documents (even .lean()'d ones) still
  // carry ObjectId/Date instances for _id etc, so these get converted to
  // plain strings/booleans here before handing off to QuestionsTabs.
  const facultyOptions = faculties.map((f: any) => ({ _id: f._id.toString(), name: f.name }));
  const subjectOptions = subjects.map((s: any) => ({ _id: s._id.toString(), name: s.name }));
  const questionRows = questions.map((q: any) => ({
    _id: q._id.toString(),
    question: q.question as string,
    imageUrl: (q.imageUrl as string) ?? null,
    chapter: (q.chapter as string) ?? null,
    difficulty: q.difficulty as string,
    isActive: q.isActive as boolean,
  }));

  return (
    <div>
      <h1>Questions</h1>
      <QuestionsTabs
        faculties={facultyOptions}
        activeFacultyId={activeFacultyId}
        subjects={subjectOptions}
        activeSubjectId={activeSubjectId}
        questions={questionRows}
      />
    </div>
  );
}