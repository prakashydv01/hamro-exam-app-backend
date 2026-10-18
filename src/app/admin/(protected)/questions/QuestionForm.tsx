'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createQuestion, type ActionResult } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add question'}</button>;
}

export default function QuestionForm({ subjects }: { subjects: { _id: string; name: string }[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(createQuestion, undefined);

  return (
    <form action={formAction}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="subjectId">Subject</label>
        <select id="subjectId" name="subjectId" required>
          {subjects.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="question">Question</label>
        <textarea id="question" name="question" required style={{ minHeight: 60 }} />
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="imageUrl">Question image URL (optional)</label>
        <input id="imageUrl" name="imageUrl" placeholder="https://res.cloudinary.com/.../diagram.png" />
      </div>

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="chapter">Chapter (optional)</label>
        <input id="chapter" name="chapter" />
      </div>

      {['a', 'b', 'c', 'd'].map((id) => (
        <div className="field" key={id} style={{ marginBottom: 10 }}>
          <label htmlFor={`option_${id}`}>Option {id.toUpperCase()} {id === 'a' || id === 'b' ? '' : '(optional)'}</label>
          <input id={`option_${id}`} name={`option_${id}`} required={id === 'a' || id === 'b'} />
        </div>
      ))}

      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor="correctOptionId">Correct option</label>
        <select id="correctOptionId" name="correctOptionId" required defaultValue="a">
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
          <option value="d">D</option>
        </select>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="explanation">Explanation (optional)</label>
        <textarea id="explanation" name="explanation" style={{ minHeight: 50 }} />
      </div>

      <SubmitButton />
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <p style={{ color: '#166534', fontSize: 13, marginTop: 10 }}>{state.success}</p>}
    </form>
  );
}