'use client';

import { useMemo, useState, useTransition } from 'react';
import { toggleQuestionActive, deleteQuestion, deleteQuestionsBulk } from './actions';
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
  createdAt: string | null;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Only ever count ids that still exist on screen (e.g. after a delete/refresh).
  const visibleIds = useMemo(() => new Set(questions.map((q) => q._id)), [questions]);
  const selectedIds = useMemo(() => Array.from(selected).filter((id) => visibleIds.has(id)), [selected, visibleIds]);
  const allSelected = questions.length > 0 && selectedIds.length === questions.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(questions.map((q) => q._id)));
  }

  function selectByDate() {
    if (!fromDate && !toDate) {
      setMessage({ kind: 'err', text: 'Pick a from and/or to date first.' });
      return;
    }
    // Day boundaries in the admin's own timezone.
    const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;
    const ids = questions
      .filter((q) => {
        if (!q.createdAt) return false;
        const t = new Date(q.createdAt).getTime();
        return t >= start && t <= end;
      })
      .map((q) => q._id);
    setSelected(new Set(ids));
    setMessage({ kind: 'ok', text: `${ids.length} question${ids.length === 1 ? '' : 's'} selected for that date range - review, then press Delete selected.` });
  }

  function selectToday() {
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFromDate(iso);
    setToDate(iso);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedIds.length} question${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteQuestionsBulk(selectedIds);
      if (res.error) setMessage({ kind: 'err', text: res.error });
      else {
        setMessage({ kind: 'ok', text: res.success ?? 'Deleted' });
        setSelected(new Set());
      }
    });
  }

  function formatDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  }

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

          <div className="inline-form" style={{ marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field">
              <label htmlFor="fromDate">Created from</label>
              <input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="toDate">Created to</label>
              <input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button type="button" className="secondary" onClick={selectToday}>Today</button>
            <button type="button" className="secondary" onClick={selectByDate}>Select by date</button>
            <button
              type="button"
              className="secondary"
              onClick={() => { setFromDate(''); setToDate(''); setSelected(new Set()); setMessage(null); }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className="muted">
              {selectedIds.length} selected of {questions.length}
            </span>
            <button type="button" className="danger" disabled={selectedIds.length === 0 || pending} onClick={deleteSelected}>
              {pending ? 'Deleting…' : `Delete selected (${selectedIds.length})`}
            </button>
            {message && (
              <span style={{ fontSize: 13, color: message.kind === 'ok' ? '#166534' : '#b91c1c' }}>{message.text}</span>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />
                </th>
                <th>Question</th>
                <th>Image</th>
                <th>Chapter</th>
                <th>Created</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 && (
                <tr><td colSpan={8} className="muted">No questions in this subject yet.</td></tr>
              )}
              {questions.map((q) => (
                <tr key={q._id} style={selected.has(q._id) ? { background: '#fef2f2' } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label="Select question"
                      checked={selected.has(q._id)}
                      onChange={() => toggleOne(q._id)}
                    />
                  </td>
                  <td style={{ maxWidth: 420 }}>{q.question}</td>
                  <td>
                    {q.imageUrl ? (
                      <a href={q.imageUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{q.chapter || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(q.createdAt)}</td>
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