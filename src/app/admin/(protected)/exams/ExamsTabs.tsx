'use client';

import { useState } from 'react';
import { toggleExamActive, deleteExamConfig } from './actions';
import ExamForm, { type ChapterOption } from './ExamForm';

type Tab = 'view' | 'create';

interface FacultyOption { _id: string; name: string }
interface SubjectOption { _id: string; name: string; facultyId: string }
interface ExamRow {
  _id: string;
  title: string;
  facultyName: string;
  examType: 'practice' | 'mock';
  totalQuestions: number;
  duration: number;
  correctMarks: number;
  negativeMarks: number;
  isActive: boolean;
  subjectsLabel: string;
}

interface ExamsTabsProps {
  exams: ExamRow[];
  faculties: FacultyOption[];
  subjects: SubjectOption[];
  chapters: ChapterOption[];
}

export default function ExamsTabs({ exams, faculties, subjects, chapters }: ExamsTabsProps) {
  const [tab, setTab] = useState<Tab>('view');

  return (
    <div>
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
          View Exams
        </button>
        <button type="button" className={`admin-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
          Create Exam
        </button>
      </div>

      {tab === 'view' && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Faculty</th>
                <th>Type</th>
                <th>Subject / Chapter</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Marking</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 && (
                <tr><td colSpan={9} className="muted">No exams yet - use the "Create Exam" tab.</td></tr>
              )}
              {exams.map((e) => (
                <tr key={e._id}>
                  <td>{e.title}</td>
                  <td>{e.facultyName}</td>
                  <td>{e.examType}</td>
                  <td style={{ maxWidth: 260 }}>{e.subjectsLabel}</td>
                  <td>{e.totalQuestions}</td>
                  <td>{e.duration} min</td>
                  <td>+{e.correctMarks} / -{e.negativeMarks}</td>
                  <td>
                    <span className={`badge ${e.isActive ? 'active' : 'inactive'}`}>
                      {e.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <form
                      action={toggleExamActive.bind(null, e._id, !e.isActive)}
                      style={{ display: 'inline-block', marginRight: 6 }}
                    >
                      <button type="submit" className={`small ${e.isActive ? 'secondary' : ''}`}>
                        {e.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <DeleteExamButton id={e._id} title={e.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'create' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Create exam</h2>
          {faculties.length === 0 ? (
            <p className="muted">Add a faculty and subjects first.</p>
          ) : (
            <ExamForm faculties={faculties} subjects={subjects} chapters={chapters} />
          )}
        </div>
      )}
    </div>
  );
}

// Small client-only wrapper so we can confirm before a destructive delete -
// the other admin delete/toggle actions skip this, but deleting an exam
// config is harder to recover from by accident, so it gets a guard.
function DeleteExamButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteExamConfig.bind(null, id)}
      style={{ display: 'inline-block' }}
      onSubmit={(e) => {
        if (!confirm(`Delete "${title}"? This cannot be undone. Past attempts/results are kept, but this exam can no longer be started.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="small danger">Delete</button>
    </form>
  );
}