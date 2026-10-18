'use client';

import { useState } from 'react';
import { toggleQuestionActive, deleteQuestion } from './actions';
import QuestionForm from './QuestionForm';
import BulkImportForm from './BulkImportForm';

type Tab = 'view' | 'add' | 'bulk';

interface FacultyOption { _id: string; name: string }
interface SubjectOption { _id: string; name: string }
interface QuestionRow {
  _id: string;
  question: string;
  imageUrl: string | null;
  chapter: string | null;
  difficulty: string;
  isActive: boolean;
}

interface QuestionsTabsProps {
  faculties: FacultyOption[];
  activeFacultyId?: string;
  subjects: SubjectOption[];
  activeSubjectId?: string;
  questions: QuestionRow[];
}

export default function QuestionsTabs({
  faculties,
  activeFacultyId,
  subjects,
  activeSubjectId,
  questions,
}: QuestionsTabsProps) {
  const [tab, setTab] = useState<Tab>('view');

  return (
    <div>
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
          View / Filter Questions
        </button>
        <button type="button" className={`admin-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          Add Question
        </button>
        <button type="button" className={`admin-tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>
          Bulk Import
        </button>
      </div>

      {tab === 'view' && (
        <div className="panel">
          <form method="get" className="inline-form" style={{ marginBottom: 20 }}>
            <div className="field">
              <label htmlFor="facultyId">Faculty</label>
              <select id="facultyId" name="facultyId" defaultValue={activeFacultyId}>
                {faculties.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subjectId">Subject</label>
              <select id="subjectId" name="subjectId" defaultValue={activeSubjectId}>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="secondary">Filter</button>
          </form>

          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Image</th>
                <th>Chapter</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 && (
                <tr><td colSpan={6} className="muted">No questions in this subject yet.</td></tr>
              )}
              {questions.map((q) => (
                <tr key={q._id}>
                  <td style={{ maxWidth: 420 }}>{q.question}</td>
                  <td>
                    {q.imageUrl ? (
                      <a href={q.imageUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{q.chapter || '—'}</td>
                  <td>{q.difficulty}</td>
                  <td>
                    <span className={`badge ${q.isActive ? 'active' : 'inactive'}`}>
                      {q.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <form
                      action={toggleQuestionActive.bind(null, q._id, !q.isActive)}
                      style={{ display: 'inline-block', marginRight: 6 }}
                    >
                      <button type="submit" className={`small ${q.isActive ? 'secondary' : ''}`}>
                        {q.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteQuestion.bind(null, q._id)} style={{ display: 'inline-block' }}>
                      <button type="submit" className="small danger">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'add' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Add single question</h2>
          {subjects.length === 0 ? (
            <p className="muted">Select a faculty with subjects first (use the "View / Filter" tab's dropdown).</p>
          ) : (
            <QuestionForm subjects={subjects} />
          )}
        </div>
      )}

      {tab === 'bulk' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Bulk import (paste JSON)</h2>
          <p className="muted">Paste an array of questions — see placeholder for the expected shape.</p>
          {subjects.length === 0 ? (
            <p className="muted">Select a faculty with subjects first (use the "View / Filter" tab's dropdown).</p>
          ) : (
            <BulkImportForm subjects={subjects} />
          )}
        </div>
      )}
    </div>
  );
}