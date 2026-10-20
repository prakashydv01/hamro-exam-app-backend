'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createCategory, type ActionResult } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

export default function CategoryForm() {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    createCategory,
    undefined as unknown as ActionResult,
  );

  return (
    <form action={formAction} className="inline-form">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required placeholder="e.g. Loksewa" />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional)</label>
        <input id="slug" name="slug" placeholder="auto-generated if blank" />
      </div>
      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}