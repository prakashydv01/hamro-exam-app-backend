import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Question from '@/models/Question';
import Attempt from '@/models/Attempt';
import ExamConfig from '@/models/ExamConfig';
import { Category, Faculty, Subject } from '@/models/Taxonomy';

export default async function DashboardPage() {
  await connectDB();

  const [userCount, questionCount, attemptCount, activeExamCount, categoryCount, facultyCount, subjectCount, recentAttempts] =
    await Promise.all([
      User.countDocuments({ role: 'user' }),
      Question.countDocuments({ isActive: true }),
      Attempt.countDocuments({ status: { $ne: 'in-progress' } }),
      ExamConfig.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Faculty.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Attempt.find({ status: { $ne: 'in-progress' } })
        .sort({ submittedAt: -1 })
        .limit(10)
        .populate('userId', 'name')
        .populate('examId', 'title')
        .lean(),
    ]);

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="card-grid">
        <StatCard label="Users" value={userCount} />
        <StatCard label="Active Questions" value={questionCount} />
        <StatCard label="Attempts (completed)" value={attemptCount} />
        <StatCard label="Active Exams" value={activeExamCount} />
        <StatCard label="Categories" value={categoryCount} />
        <StatCard label="Faculties" value={facultyCount} />
        <StatCard label="Subjects" value={subjectCount} />
      </div>

      <h2>Recent attempts</h2>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Exam</th>
            <th>Score</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {recentAttempts.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">No attempts yet.</td>
            </tr>
          )}
          {recentAttempts.map((a: any) => (
            <tr key={a._id.toString()}>
              <td>{a.userId?.name ?? '—'}</td>
              <td>{a.examId?.title ?? '—'}</td>
              <td>{a.score} / {a.totalQuestions}</td>
              <td>{a.status}</td>
              <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
