'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import { Subject } from '@/models/Taxonomy';
import Question from '@/models/Question';
import ExamConfig from '@/models/ExamConfig';
import { slugify } from '@/lib/slugify';

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function createSubject(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  const facultyId = formData.get('facultyId') as string;
  if (!name || !facultyId) {
    return { error: 'Name and faculty are required' };
  }

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Subject.create({ name, slug, facultyId });
  } catch (err: any) {
    if (err.code === 11000) {
      return {
        error: `A subject with slug "${slug}" already exists for this faculty. Try a different name, or set a custom slug below.`,
      };
    }
    throw err;
  }

  revalidatePath('/admin/subjects');
  return { success: 'Subject added' };
}

export async function updateSubject(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  const facultyId = formData.get('facultyId') as string;
  if (!name || !facultyId) return { error: 'Name and faculty are required' };

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Subject.findByIdAndUpdate(id, { name, slug, facultyId });
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: `A subject with slug "${slug}" already exists for this faculty.` };
    }
    throw err;
  }

  revalidatePath('/admin/subjects');
  return { success: 'Subject updated' };
}

export async function toggleSubjectActive(id: string, nextActive: boolean) {
  await connectDB();
  await Subject.findByIdAndUpdate(id, { isActive: nextActive });
  revalidatePath('/admin/subjects');
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  await connectDB();

  const [questionCount, practiceExamCount, mockExamCount] = await Promise.all([
    Question.countDocuments({ subjectId: id }),
    ExamConfig.countDocuments({ subjectId: id }),
    ExamConfig.countDocuments({ 'subjectDistribution.subjectId': id }),
  ]);
  const examCount = practiceExamCount + mockExamCount;

  if (questionCount > 0 || examCount > 0) {
    const parts: string[] = [];
    if (questionCount > 0) parts.push(`${questionCount} question${questionCount === 1 ? '' : 's'}`);
    if (examCount > 0) parts.push(`${examCount} exam${examCount === 1 ? '' : 's'}`);
    return { error: `Cannot delete - ${parts.join(' and ')} still reference this subject. Delete or reassign them first.` };
  }

  await Subject.findByIdAndDelete(id);
  revalidatePath('/admin/subjects');
  return { success: 'Subject deleted' };
}
