'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createSubject, updateSubject, toggleSubjectActive, deleteSubject, type ActionResult } from './actions';

type Tab = 'view' | 'add';

interface FacultyOption { _id: string; name: string }
interface SubjectRow {
  _id: string;
  name: string;
  slug: string;
  facultyId: string;
  facultyName: string;
  isActive: boolean;
}

interface SubjectsTabsProps {
  subjects: SubjectRow[];
  faculties: FacultyOption[];
}

export default function SubjectsTabs({ subjects, faculties }: SubjectsTabsProps) {
  const [tab, setTab] = useState<Tab>('view');
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
          View Subjects
        </button>
        <button type="button" className={`admin-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          Add Subject
        </button>
      </div>

      {tab === 'view' && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Faculty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 && (
                <tr><td colSpan={5} className="muted">No subjects yet - use the "Add Subject" tab.</td></tr>
              )}
              {subjects.map((s) =>
                editingId === s._id ? (
                  <EditSubjectRow key={s._id} subject={s} faculties={faculties} onDone={() => setEditingId(null)} />
                ) : (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td>{s.slug}</td>
                    <td>{s.facultyName}</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'active' : 'inactive'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="small" style={{ marginRight: 6 }} onClick={() => setEditingId(s._id)}>
                        Edit
                      </button>
                      <form
                        action={toggleSubjectActive.bind(null, s._id, !s.isActive)}
                        style={{ display: 'inline-block', marginRight: 6 }}
                      >
                        <button type="submit" className={`small ${s.isActive ? 'secondary' : ''}`}>
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                      <DeleteSubjectButton id={s._id} name={s.name} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'add' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Add subject</h2>
          {faculties.length === 0 ? (
            <p className="muted">Add a faculty first before adding subjects.</p>
          ) : (
            <AddSubjectForm faculties={faculties} />
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? pendingLabel : label}</button>;
}

function AddSubjectForm({ faculties }: { faculties: FacultyOption[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(createSubject, undefined);

  return (
    <form action={formAction} className="inline-form">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="e.g. Physics" />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional)</label>
        <input id="slug" name="slug" placeholder="auto-generated if blank" />
      </div>
      <div className="field">
        <label htmlFor="facultyId">Faculty</label>
        <select id="facultyId" name="facultyId" required>
          {faculties.map((f) => (
            <option key={f._id} value={f._id}>{f.name}</option>
          ))}
        </select>
      </div>
      <SubmitButton label="Add" pendingLabel="Adding…" />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}

function EditSubjectRow({
  subject,
  faculties,
  onDone,
}: {
  subject: SubjectRow;
  faculties: FacultyOption[];
  onDone: () => void;
}) {
  const boundUpdate = updateSubject.bind(null, subject._id);
  const [state, formAction] = useFormState<ActionResult, FormData>(boundUpdate, undefined);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <tr>
      <td colSpan={5}>
        <form action={formAction} className="inline-form">
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={subject.name} required />
          </div>
          <div className="field">
            <label>Slug</label>
            <input name="slug" defaultValue={subject.slug} />
          </div>
          <div className="field">
            <label>Faculty</label>
            <select name="facultyId" defaultValue={subject.facultyId} required>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>
          <SubmitButton label="Save" pendingLabel="Saving…" />
          <button type="button" className="secondary" onClick={onDone}>Cancel</button>
        </form>
        {state?.error && <p className="error-text">{state.error}</p>}
      </td>
    </tr>
  );
}

function DeleteSubjectButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setPending(true);
    const result = await deleteSubject(id);
    setPending(false);
    if (result.error) alert(result.error);
  }

  return (
    <button type="button" className="small danger" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
