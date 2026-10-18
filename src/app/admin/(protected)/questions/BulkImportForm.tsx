'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { bulkImportQuestions, type ActionResult } from './actions';

const EXAMPLE = `[
  {
    "question": "She is very good ________ swimming.",
    "options": ["at", "on", "of", "for"],
    "correctAnswer": 0,
    "difficulty": "easy",
    "chapter": "preposition",
    "explanation": "The correct preposition to use with 'good' when referring to a skill or activity is 'at'."
  }
]`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Importing…' : 'Import batch'}</button>;
}

export default function BulkImportForm({ subjects }: { subjects: { _id: string; name: string }[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(bulkImportQuestions, undefined);

  return (
    <form action={formAction}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="bulkSubjectId">Subject (applies to entire batch)</label>
        <select id="bulkSubjectId" name="bulkSubjectId" required>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="bulkJson">Questions JSON (array)</label>
        <textarea id="bulkJson" name="bulkJson" placeholder={EXAMPLE} />
      </div>

      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}