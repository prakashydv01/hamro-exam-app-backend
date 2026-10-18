'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateCategory, toggleCategoryActive, deleteCategory, type ActionResult } from './actions';
import CategoryForm from './CategoryForm';

type Tab = 'view' | 'add';

interface CategoryRow {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function CategoriesTabs({ categories }: { categories: CategoryRow[] }) {
  const [tab, setTab] = useState<Tab>('view');
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div>
      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
          View Categories
        </button>
        <button type="button" className={`admin-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
          Add Category
        </button>
      </div>

      {tab === 'view' && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={4} className="muted">No categories yet - use the "Add Category" tab.</td></tr>
              )}
              {categories.map((c) =>
                editingId === c._id ? (
                  <EditCategoryRow key={c._id} category={c} onDone={() => setEditingId(null)} />
                ) : (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.slug}</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'active' : 'inactive'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="small" style={{ marginRight: 6 }} onClick={() => setEditingId(c._id)}>
                        Edit
                      </button>
                      <form
                        action={toggleCategoryActive.bind(null, c._id, !c.isActive)}
                        style={{ display: 'inline-block', marginRight: 6 }}
                      >
                        <button type="submit" className={`small ${c.isActive ? 'secondary' : ''}`}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                      <DeleteCategoryButton id={c._id} name={c.name} />
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
          <h2 style={{ marginTop: 0 }}>Add category</h2>
          <CategoryForm />
        </div>
      )}
    </div>
  );
}

function EditSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

function EditCategoryRow({ category, onDone }: { category: CategoryRow; onDone: () => void }) {
  const boundUpdate = updateCategory.bind(null, category._id);
  const [state, formAction] = useFormState<ActionResult, FormData>(boundUpdate, undefined);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <tr>
      <td colSpan={4}>
        <form action={formAction} className="inline-form">
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={category.name} required />
          </div>
          <div className="field">
            <label>Slug</label>
            <input name="slug" defaultValue={category.slug} />
          </div>
          <EditSubmitButton />
          <button type="button" className="secondary" onClick={onDone}>Cancel</button>
        </form>
        {state?.error && <p className="error-text">{state.error}</p>}
      </td>
    </tr>
  );
}

function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setPending(true);
    const result = await deleteCategory(id);
    setPending(false);
    if (result.error) alert(result.error);
  }

  return (
    <button type="button" className="small danger" onClick={handleDelete} disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
