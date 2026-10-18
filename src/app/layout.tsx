import type { ReactNode } from 'react';
import './admin/globals.css';

export const metadata = {
  title: 'Hamro Exam Admin',
};

// This is the only root layout in the project - the rest of the app is
// API routes only (no pages), so this exists purely to satisfy Next.js's
// requirement of one <html>/<body> wrapper wherever pages are rendered.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
