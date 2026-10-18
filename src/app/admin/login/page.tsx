'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAdmin } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAdmin, undefined);

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Hamro Exam Admin</h1>
        <p>Sign in to manage exams, questions, and content.</p>
        <form action={formAction}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <SubmitButton />
          {state?.error && <p className="error-text">{state.error}</p>}
        </form>
      </div>
    </div>
  );
}
