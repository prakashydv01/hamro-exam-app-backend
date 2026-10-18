'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createFaculty, type ActionResult } from './actions';

interface CategoryOption { _id: string; name: string }

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

export default function FacultyForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(createFaculty, undefined);

  return (
    <form action={formAction} className="inline-form">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="e.g. IOE" />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional)</label>
        <input id="slug" name="slug" placeholder="auto-generated if blank" />
      </div>
      <div className="field">
        <label htmlFor="categoryId">Category</label>
        <select id="categoryId" name="categoryId" required>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>
      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}