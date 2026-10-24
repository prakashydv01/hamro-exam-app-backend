'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createExamConfig, type ActionResult } from './actions';

interface Faculty { _id: string; name: string }
interface Subject { _id: string; name: string; facultyId: string }
export interface ChapterOption { subjectId: string; chapter: string; count: number }

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Create exam'}</button>;
}

export default function ExamForm({
  faculties,
  subjects,
  chapters,
}: {
  faculties: Faculty[];
  subjects: Subject[];
  chapters: ChapterOption[];
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(createExamConfig, {});
  const [facultyId, setFacultyId] = useState(faculties[0]?._id ?? '');
  const [examType, setExamType] = useState<'practice' | 'mock'>('practice');
  const [rows, setRows] = useState<{ subjectId: string; count: number }[]>([]);

  const [practiceSubjectId, setPracticeSubjectId] = useState('');
  const [chapterWise, setChapterWise] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);

  const subjectsForFaculty = subjects.filter((s) => s.facultyId === facultyId);

  // Practice: the selected subject (falls back to the first one when faculty changes)
  const activeSubjectId = subjectsForFaculty.some((s) => s._id === practiceSubjectId)
    ? practiceSubjectId
    : subjectsForFaculty[0]?._id ?? '';
  const chaptersForSubject = chapters.filter((c) => c.subjectId === activeSubjectId);
  const subjectTotal = chaptersForSubject.reduce((sum, c) => sum + c.count, 0);

  function addRow() {
    if (subjectsForFaculty.length === 0) return;
    setRows([...rows, { subjectId: subjectsForFaculty[0]._id, count: 10 }]);
  }

  function updateRow(index: number, patch: Partial<{ subjectId: string; count: number }>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  const mockTotal = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);

  return (
    <form action={formAction}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required placeholder="e.g. IOE Mock Test 2" />
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="facultyId">Faculty</label>
        <select
          id="facultyId"
          name="facultyId"
          value={facultyId}
          onChange={(e) => { setFacultyId(e.target.value); setRows([]); }}
        >
          {faculties.map((f) => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="examType">Exam type</label>
        <select
          id="examType"
          name="examType"
          value={examType}
          onChange={(e) => setExamType(e.target.value as 'practice' | 'mock')}
        >
          <option value="practice">Practice (one subject or chapter)</option>
          <option value="mock">Mock test (cross-subject)</option>
        </select>
      </div>

      {examType === 'practice' ? (
        <>
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="subjectId">Subject</label>
            <select
              id="subjectId"
              name="subjectId"
              value={activeSubjectId}
              onChange={(e) => setPracticeSubjectId(e.target.value)}
            >
              {subjectsForFaculty.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              id="chapterWise"
              name="chapterWise"
              type="checkbox"
              checked={chapterWise}
              onChange={(e) => setChapterWise(e.target.checked)}
            />
            <label htmlFor="chapterWise" style={{ margin: 0 }}>
              Chapter-wise - students pick a chapter before practicing
            </label>
          </div>
          {chapterWise && (
            <p className="muted" style={{ marginTop: -4, marginBottom: 10 }}>
              {chaptersForSubject.length === 0
                ? 'No chapters found for this subject yet - add a "chapter" to its questions first.'
                : `Chapters from your questions: ${chaptersForSubject.map((c) => `${c.chapter} (${c.count})`).join(', ')}. If a chapter has fewer questions than the total below, all of its questions are used.`}
            </p>
          )}
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="totalQuestions">Total questions</label>
            <input
              id="totalQuestions"
              name="totalQuestions"
              type="number"
              min={1}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
            />
          </div>
        </>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: '#6b7280' }}>Subject distribution</label>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <select value={row.subjectId} onChange={(e) => updateRow(i, { subjectId: e.target.value })}>
                {subjectsForFaculty.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={row.count}
                onChange={(e) => updateRow(i, { count: Number(e.target.value) })}
                style={{ width: 80 }}
              />
              <button type="button" className="small danger" onClick={() => removeRow(i)}>Remove</button>
            </div>
          ))}
          <button type="button" className="small secondary" style={{ marginTop: 8 }} onClick={addRow}>
            + Add subject
          </button>
          <p className="muted" style={{ marginTop: 8 }}>Total questions: {mockTotal}</p>
          <input type="hidden" name="subjectDistributionJson" value={JSON.stringify(rows)} />
        </div>
      )}

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="duration">Duration (minutes)</label>
        <input id="duration" name="duration" type="number" min={1} defaultValue={30} required />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div className="field">
          <label htmlFor="correctMarks">Marks per correct answer</label>
          <input id="correctMarks" name="correctMarks" type="number" step="0.01" min={0} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="negativeMarks">Negative marks per wrong answer</label>
          <input id="negativeMarks" name="negativeMarks" type="number" step="0.01" min={0} defaultValue={0} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input id="shuffleOptions" name="shuffleOptions" type="checkbox" defaultChecked />
        <label htmlFor="shuffleOptions" style={{ margin: 0 }}>Shuffle answer options per attempt</label>
      </div>

      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}