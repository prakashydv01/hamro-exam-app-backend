'use server';

import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword } from '@/lib/password';
import { signAdminSession, setAdminSessionCookie } from '@/lib/adminSession';

export async function loginAdmin(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  await connectDB();
  const user = await User.findOne({ email });

  if (!user || user.role !== 'admin') {
    // Same error for "no such user" and "not an admin" - don't leak which.
    return { error: 'Invalid credentials' };
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    return { error: 'Invalid credentials' };
  }

  const token = signAdminSession({ userId: user.id, name: user.name, email: user.email });
  setAdminSessionCookie(token);

  redirect('/admin/dashboard');
}
