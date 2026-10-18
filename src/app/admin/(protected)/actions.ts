'use server';

import { redirect } from 'next/navigation';
import { clearAdminSessionCookie } from '@/lib/adminSession';

export async function logoutAdmin() {
  clearAdminSessionCookie();
  redirect('/admin/login');
}
