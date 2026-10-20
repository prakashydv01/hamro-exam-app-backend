'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateFaculty, toggleFacultyActive, deleteFaculty, type ActionResult } from './actions';
import FacultyForm from './FacultyForm';

type Tab = 'view' | 'add';

interface CategoryOption { _id: string; name: string }
interface FacultyRow {
  _id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
}

export default function FacultiesTabs({ faculties, categories }: { faculties: FacultyRow[]; categories: CategoryOption[] }) {
  const [tab, setTab] = useState<Tab>('view');
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
          View Faculties
        </button>
        <button type="button" className={`admin-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          Add Faculty
        </button>
      </div>

      {tab === 'view' && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Category</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faculties.length === 0 && (
                <tr><td colSpan={5} className="muted">No faculties yet - use the "Add Faculty" tab.</td></tr>
              )}
              {faculties.map((f) =>
                editingId === f._id ? (
                  <EditFacultyRow key={f._id} faculty={f} categories={categories} onDone={() => setEditingId(null)} />
                ) : (
                  <tr key={f._id}>
                    <td>{f.name}</td>
                    <td>{f.slug}</td>
                    <td>{f.categoryName}</td>
                    <td>
                      <span className={`badge ${f.isActive ? 'active' : 'inactive'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="small" style={{ marginRight: 6 }} onClick={() => setEditingId(f._id)}>
                        Edit
                      </button>
                      <form
                        action={toggleFacultyActive.bind(null, f._id, !f.isActive)}
                        style={{ display: 'inline-block', marginRight: 6 }}
                      >
                        <button type="submit" className={`small ${f.isActive ? 'secondary' : ''}`}>
                          {f.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                      <DeleteFacultyButton id={f._id} name={f.name} />
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
          <h2 style={{ marginTop: 0 }}>Add faculty</h2>
          {categories.length === 0 ? (
            <p className="muted">Add a category first before adding faculties.</p>
          ) : (
            <FacultyForm categories={categories} />
          )}
        </div>
      )}
    </div>
  );
}

function EditSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

function EditFacultyRow({
  faculty,
  categories,
  onDone,
}: {
  faculty: FacultyRow;
  categories: CategoryOption[];
  onDone: () => void;
}) {
  const boundUpdate = updateFaculty.bind(null, faculty._id);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(boundUpdate, undefined);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <tr>
      <td colSpan={5}>
        <form action={formAction} className="inline-form">
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={faculty.name} required />
          </div>
          <div className="field">
            <label>Slug</label>
            <input name="slug" defaultValue={faculty.slug} />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="categoryId" defaultValue={faculty.categoryId} required>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <EditSubmitButton />
          <button type="button" className="secondary" onClick={onDone}>Cancel</button>
        </form>
        {state?.error && <p className="error-text">{state.error}</p>}
      </td>
    </tr>
  );
}

function DeleteFacultyButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setPending(true);
    const result = await deleteFaculty(id);
    setPending(false);
    if (result.error) alert(result.error);
  }

  return (
    <button type="button" className="small danger" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
