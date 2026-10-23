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
  },
  {
    "question": "If $f(x) = x^2 - 4x + 3$, find the value of $f(2)$.",
    "options": ["$-1$", "$0$", "$1$", "$3$"],
    "correctAnswer": 0,
    "chapter": "functions",
    "explanation": "$f(2) = 2^2 - 4(2) + 3 = -1$"
  },
  {
    "question": "Evaluate $$\\int_0^1 x^2\\,dx$$",
    "options": ["$\\frac{1}{2}$", "$\\frac{1}{3}$", "$\\frac{1}{4}$", "$1$"],
    "correctAnswer": 1,
    "chapter": "calculus"
  },
  {
    "question": "Which option shows the correct mirror image of the given figure?",
    "imageUrl": "https://your-host.com/q45-stem.png",
    "options": [
      { "imageUrl": "https://your-host.com/q45-option-a.png" },
      { "imageUrl": "https://your-host.com/q45-option-b.png" },
      { "imageUrl": "https://your-host.com/q45-option-c.png" },
      { "imageUrl": "https://your-host.com/q45-option-d.png" }
    ],
    "correctAnswer": 1,
    "chapter": "non-verbal reasoning"
  }
]`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Importing…' : 'Import batch'}</button>;
}

export default function BulkImportForm({ subjects }: { subjects: { _id: string; name: string }[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(bulkImportQuestions, {});

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

      <p className="muted" style={{ marginBottom: 10 }}>
        Each option in the array can be a plain string (text-only), or an object like{' '}
        <code>{'{ "imageUrl": "...", "text": "optional" }'}</code> for image-based options
        (mirror images, sequences, matrices).{' '}
        <b>Math:</b> wrap LaTeX in <code>$...$</code> (inline) or <code>$$...$$</code> (own line), e.g.{' '}
        <code>{'"$\\frac{1}{2}$"'}</code>. Single backslashes are fine - they are fixed automatically.
        Write a literal dollar sign as <code>\$</code>.
      </p>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="bulkJson">Questions JSON (array)</label>
        <textarea id="bulkJson" name="bulkJson" placeholder={EXAMPLE} style={{ minHeight: 280 }} />
      </div>

      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}