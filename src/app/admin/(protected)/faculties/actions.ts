'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import { Faculty, Subject } from '@/models/Taxonomy';
import ExamConfig from '@/models/ExamConfig';
import { slugify } from '@/lib/slugify';

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function createFaculty(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  const categoryId = formData.get('categoryId') as string;
  if (!name || !categoryId) return { error: 'Name and category are required' };

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Faculty.create({ name, slug, categoryId });
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: `A faculty with slug "${slug}" already exists. Try a different name, or set a custom slug below.` };
    }
    throw err;
  }

  revalidatePath('/admin/faculties');
  return { success: 'Faculty added' };
}

export async function updateFaculty(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  const categoryId = formData.get('categoryId') as string;
  if (!name || !categoryId) return { error: 'Name and category are required' };

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Faculty.findByIdAndUpdate(id, { name, slug, categoryId });
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: `A faculty with slug "${slug}" already exists.` };
    }
    throw err;
  }

  revalidatePath('/admin/faculties');
  return { success: 'Faculty updated' };
}

export async function toggleFacultyActive(id: string, nextActive: boolean) {
  await connectDB();
  await Faculty.findByIdAndUpdate(id, { isActive: nextActive });
  revalidatePath('/admin/faculties');
}

export async function deleteFaculty(id: string): Promise<ActionResult> {
  await connectDB();

  const [subjectCount, examCount] = await Promise.all([
    Subject.countDocuments({ facultyId: id }),
    ExamConfig.countDocuments({ facultyId: id }),
  ]);

  if (subjectCount > 0 || examCount > 0) {
    const parts: string[] = [];
    if (subjectCount > 0) parts.push(`${subjectCount} subject${subjectCount === 1 ? '' : 's'}`);
    if (examCount > 0) parts.push(`${examCount} exam${examCount === 1 ? '' : 's'}`);
    return { error: `Cannot delete - ${parts.join(' and ')} still belong to this faculty. Delete or move them first.` };
  }

  await Faculty.findByIdAndDelete(id);
  revalidatePath('/admin/faculties');
  return { success: 'Faculty deleted' };
}
