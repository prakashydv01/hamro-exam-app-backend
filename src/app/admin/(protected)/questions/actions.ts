'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Question from '@/models/Question';
import { Subject } from '@/models/Taxonomy';
import { bulkQuestionImportSchema } from '@/lib/validation';
import { parseLenientJson } from '@/lib/lenientJson';

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function createQuestion(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();

  const subjectId = formData.get('subjectId') as string;
  const question = (formData.get('question') as string)?.trim();
  const imageUrl = (formData.get('imageUrl') as string)?.trim();
  const correctOptionId = formData.get('correctOptionId') as string;
  const explanation = (formData.get('explanation') as string)?.trim();
  const chapter = (formData.get('chapter') as string)?.trim();

  if (!subjectId || !question || !correctOptionId) {
    return { error: 'Subject, question text, and correct option are required' };
  }

  if (imageUrl && !isValidUrl(imageUrl)) {
    return { error: 'Question image URL must be a valid URL (e.g. https://...)' };
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) return { error: 'Unknown subject' };

  // An option counts as "filled in" if it has text OR an image - this is
  // what allows fully image-based options (mirror/water images, sequences,
  // matrices) with no meaningful text at all.
  const options = ['a', 'b', 'c', 'd']
    .map((id) => ({
      id,
      text: (formData.get(`option_${id}`) as string)?.trim() ?? '',
      imageUrl: (formData.get(`optionImage_${id}`) as string)?.trim() || undefined,
    }))
    .filter((o) => o.text || o.imageUrl);

  if (options.length < 2) {
    return { error: 'At least 2 options are required (each needs text and/or an image)' };
  }
  if (!options.some((o) => o.id === correctOptionId)) {
    return { error: 'Correct option must match one of the filled-in options' };
  }
  for (const o of options) {
    if (o.imageUrl && !isValidUrl(o.imageUrl)) {
      return { error: `Option ${o.id.toUpperCase()} image URL is not valid` };
    }
  }

  await Question.create({
    facultyId: subject.facultyId,
    subjectId,
    chapter: chapter || undefined,
    question,
    imageUrl: imageUrl || undefined,
    options,
    correctOptionId,
    explanation: explanation || undefined,
    isActive: true,
  });

  revalidatePath('/admin/questions');
  return { success: 'Question added' };
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function bulkImportQuestions(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();

  const subjectId = formData.get('bulkSubjectId') as string;
  const rawJson = formData.get('bulkJson') as string;

  if (!subjectId) return { error: 'Select a subject for this batch' };
  if (!rawJson?.trim()) return { error: 'Paste JSON to import' };

  const subject = await Subject.findById(subjectId);
  if (!subject) return { error: 'Unknown subject' };

  let parsed: unknown;
  try {
    // Lenient: accepts LaTeX with single backslashes (\frac) as well as properly escaped (\\frac)
    parsed = parseLenientJson(rawJson);
  } catch {
    return { error: 'Invalid JSON - please check the syntax' };
  }

  const result = bulkQuestionImportSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return { error: `Validation failed at ${first.path.join('.')}: ${first.message}` };
  }

  // Normalize each option - a plain string becomes a text-only option, an
  // object with imageUrl (and optional text) becomes an image option.
  const docs = result.data.map((item) => {
    const options = item.options.map((opt, idx) => {
      const id = String.fromCharCode(97 + idx); // 97 = 'a'
      if (typeof opt === 'string') {
        return { id, text: opt };
      }
      return { id, text: opt.text ?? '', imageUrl: opt.imageUrl };
    });
    const correctOptionId = options[item.correctAnswer].id;

    return {
      facultyId: subject.facultyId,
      subjectId,
      chapter: item.chapter?.trim() || undefined,
      question: item.question,
      imageUrl: item.imageUrl,
      options,
      correctOptionId,
      explanation: item.explanation,
      difficulty: item.difficulty ?? 'medium',
      tags: item.tags ?? [],
      isActive: true,
    };
  });

  await Question.insertMany(docs);
  revalidatePath('/admin/questions');
  return { success: `Imported ${docs.length} questions` };
}

export async function toggleQuestionActive(id: string, nextActive: boolean) {
  await connectDB();
  await Question.findByIdAndUpdate(id, { isActive: nextActive });
  revalidatePath('/admin/questions');
}

export async function deleteQuestion(id: string) {
  await connectDB();
  await Question.findByIdAndDelete(id);
  revalidatePath('/admin/questions');
}

/**
 * Delete many questions at once (used by the checkbox selection in the
 * Questions tab, including "select all" and "select by date").
 */
export async function deleteQuestionsBulk(ids: string[]): Promise<ActionResult> {
  await connectDB();

  const valid = Array.from(new Set(ids)).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (valid.length === 0) return { error: 'No questions selected' };
  if (valid.length > 5000) return { error: 'Too many selected at once (max 5000)' };

  const res = await Question.deleteMany({ _id: { $in: valid } });
  revalidatePath('/admin/questions');
  return { success: `Deleted ${res.deletedCount} question${res.deletedCount === 1 ? '' : 's'}` };
}