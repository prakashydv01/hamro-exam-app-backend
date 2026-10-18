import type { ReactNode } from 'react';
import { requireAdminSession } from '@/lib/adminSession';
import { logoutAdmin } from './actions';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/faculties', label: 'Faculties' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/exams', label: 'Exams' },
];

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = requireAdminSession(); // redirects to /admin/login if not authenticated

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">Hamro Exam Admin</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <form action={logoutAdmin}>
          <p className="muted" style={{ margin: '0 0 8px' }}>{session.name}</p>
          <button type="submit" className="logout">Log out</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
