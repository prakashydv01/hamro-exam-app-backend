'use server';

import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import ExamConfig from '@/models/ExamConfig';
import Question from '@/models/Question';

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function createExamConfig(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  await connectDB();

  const facultyId = formData.get('facultyId') as string;
  const examType = formData.get('examType') as 'practice' | 'mock';
  const title = (formData.get('title') as string)?.trim();
  const duration = Number(formData.get('duration'));
  const correctMarks = Number(formData.get('correctMarks'));
  const negativeMarks = Number(formData.get('negativeMarks') || 0);
  const shuffleOptions = formData.get('shuffleOptions') === 'on';

  if (!facultyId || !examType || !title || !duration) {
    return { error: 'Faculty, exam type, title, and duration are required' };
  }

  try {
    if (examType === 'practice') {
      const subjectId = formData.get('subjectId') as string;
      const totalQuestions = Number(formData.get('totalQuestions'));
      const chapterWise = formData.get('chapterWise') === 'on';
      if (!subjectId || !totalQuestions) {
        return { error: 'Subject and total questions are required for practice exams' };
      }

      if (chapterWise) {
        const chapterCount = (await Question.distinct('chapter', { subjectId, isActive: true, chapter: { $nin: [null, ''] } })).length;
        if (chapterCount === 0) {
          return { error: 'This subject has no chapters yet - add a "chapter" to its questions, or untick Chapter-wise.' };
        }
      } else {
        // Whole-subject practice: make sure the exam can actually be started later.
        const available = await Question.countDocuments({ subjectId, isActive: true });
        if (available < totalQuestions) {
          return {
            error: `Only ${available} active question${available === 1 ? '' : 's'} in this subject - need ${totalQuestions}. Lower the total or add questions first.`,
          };
        }
      }

      await ExamConfig.create({
        facultyId,
        examType,
        title,
        subjectId,
        chapterWise,
        totalQuestions,
        duration,
        correctMarks,
        negativeMarks,
        shuffleOptions,
        isActive: true,
      });
    } else {
      const distributionJson = formData.get('subjectDistributionJson') as string;
      if (!distributionJson) return { error: 'Add at least one subject row for a mock exam' };

      let subjectDistribution: { subjectId: string; count: number }[];
      try {
        subjectDistribution = JSON.parse(distributionJson);
      } catch {
        return { error: 'Malformed subject distribution data' };
      }

      if (!Array.isArray(subjectDistribution) || subjectDistribution.length === 0) {
        return { error: 'Add at least one subject row for a mock exam' };
      }

      const totalQuestions = subjectDistribution.reduce((sum, s) => sum + Number(s.count || 0), 0);
      if (totalQuestions === 0) {
        return { error: 'Question counts must be greater than zero' };
      }

      await ExamConfig.create({
        facultyId,
        examType,
        title,
        subjectDistribution,
        totalQuestions,
        duration,
        correctMarks,
        negativeMarks,
        shuffleOptions,
        isActive: true,
      });
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to create exam' };
  }

  revalidatePath('/admin/exams');
  return { success: 'Exam created' };
}

export async function toggleExamActive(id: string, nextActive: boolean) {
  await connectDB();
  await ExamConfig.findByIdAndUpdate(id, { isActive: nextActive });
  revalidatePath('/admin/exams');
}

export async function deleteExamConfig(id: string) {
  await connectDB();
  await ExamConfig.findByIdAndDelete(id);
  // Note: this does not touch existing Attempt documents that reference
  // this exam - past attempts/results/leaderboard entries stay intact,
  // only the exam config itself (and the ability to start new attempts
  // against it) goes away. Deactivating instead of deleting is usually
  // the safer choice if students have already taken this exam.
  revalidatePath('/admin/exams');
}