'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import { Category, Faculty } from '@/models/Taxonomy';
import { slugify } from '@/lib/slugify';

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function createCategory(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name is required' };

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Category.create({ name, slug });
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: `A category with slug "${slug}" already exists. Try a different name, or set a custom slug below.` };
    }
    throw err;
  }

  revalidatePath('/admin/categories');
  return { success: 'Category added' };
}

export async function updateCategory(
  id: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Name is required' };

  const slugInput = (formData.get('slug') as string)?.trim();
  const slug = slugify(slugInput || name);

  try {
    await Category.findByIdAndUpdate(id, { name, slug });
  } catch (err: any) {
    if (err.code === 11000) {
      return { error: `A category with slug "${slug}" already exists.` };
    }
    throw err;
  }

  revalidatePath('/admin/categories');
  return { success: 'Category updated' };
}

export async function toggleCategoryActive(id: string, nextActive: boolean) {
  await connectDB();
  await Category.findByIdAndUpdate(id, { isActive: nextActive });
  revalidatePath('/admin/categories');
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await connectDB();

  const facultyCount = await Faculty.countDocuments({ categoryId: id });
  if (facultyCount > 0) {
    return {
      error: `Cannot delete - ${facultyCount} faculty${facultyCount === 1 ? '' : 'ies'} still belong to this category. Delete or move them first.`,
    };
  }

  await Category.findByIdAndDelete(id);
  revalidatePath('/admin/categories');
  return { success: 'Category deleted' };
}
