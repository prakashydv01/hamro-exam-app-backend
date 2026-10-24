import { Types } from 'mongoose';
import ExamConfig from '@/models/ExamConfig';
import Question, { IQuestion } from '@/models/Question';
import Attempt from '@/models/Attempt';
import { ApiError } from '@/lib/apiResponse';

/** Fisher-Yates shuffle - unbiased, O(n). */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pulls `count` random active questions for a subject via $sample - avoids
 * loading the whole collection into memory, and stays fast even with a
 * huge question bank. */
async function sampleQuestions(subjectId: Types.ObjectId, count: number, chapter?: string): Promise<IQuestion[]> {
  const match: Record<string, unknown> = { subjectId, isActive: true };
  if (chapter) match.chapter = chapter; // chapter-wise practice
  const docs = await Question.aggregate([
    { $match: match },
    { $sample: { size: count } },
  ]);
  return docs as IQuestion[];
}

/**
 * Mock exam question payload - no correctOptionId, no explanation. Options
 * are shuffled per-attempt; the mapping is stored server-side on the
 * Attempt document so we can grade correctly regardless of the order the
 * client saw.
 */
interface MockClientQuestion {
  questionId: string;
  subjectId: string;
  question: string;
  imageUrl?: string;
  options: { id: string; text: string; imageUrl?: string }[];
}

/**
 * Practice question payload - DOES include the answer key + explanation.
 * This is a deliberate relaxation vs. mock exams: practice has no
 * leaderboard stake and nothing is persisted, so there's no cheating
 * surface to protect by hiding the answer.
 */
interface PracticeClientQuestion extends MockClientQuestion {
  correctOptionId: string;
  explanation?: string;
}

export async function startExam(userId: string, examId: string, chapter?: string) {
  const config = await ExamConfig.findOne({ _id: examId, isActive: true });
  if (!config) throw new ApiError('Exam not found or inactive', 404, 'EXAM_NOT_FOUND');

  if (config.examType === 'practice') {
    return startPracticeExam(config, chapter);
  }
  return startMockExam(userId, config);
}

/**
 * Practice: instant-feedback quiz. No Attempt document is ever created -
 * nothing about a practice run is persisted anywhere (no DB write here,
 * and there is no corresponding submit call from the client either). This
 * means practice attempts never show up in "recent attempts," never
 * affect any leaderboard, and can be retaken freely with fresh random
 * questions every time.
 */
async function startPracticeExam(config: InstanceType<typeof ExamConfig>, requestedChapter?: string) {
  if (!config.subjectId) throw new ApiError('Malformed practice exam config', 500);

  // Chapter-wise practice: only honoured when the exam is flagged chapterWise.
  const chapter = config.chapterWise && requestedChapter ? requestedChapter.trim() : undefined;

  const questions = await sampleQuestions(config.subjectId as Types.ObjectId, config.totalQuestions, chapter);

  if (chapter) {
    // A chapter may simply have fewer questions than the exam's total - use what exists.
    if (questions.length === 0) {
      throw new ApiError('No questions available in this chapter yet.', 409, 'INSUFFICIENT_QUESTIONS');
    }
  } else if (questions.length < config.totalQuestions) {
    throw new ApiError(
      `Not enough active questions available (need ${config.totalQuestions}, have ${questions.length}). Please contact support.`,
      409,
      'INSUFFICIENT_QUESTIONS'
    );
  }

  const clientQuestions: PracticeClientQuestion[] = questions.map((q) => {
    const optionIds = q.options.map((o) => o.id);
    const orderedIds = config.shuffleOptions ? shuffle(optionIds) : optionIds;
    const optionsById = new Map<string, (typeof q.options)[number]>(q.options.map((o) => [o.id, o]));

    return {
      questionId: q._id.toString(),
      subjectId: q.subjectId.toString(),
      question: q.question,
      imageUrl: q.imageUrl,
      options: orderedIds.map((id) => {
        const o = optionsById.get(id)!;
        return { id: o.id, text: o.text, imageUrl: o.imageUrl };
      }),
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    };
  });

  return {
    attemptId: null, // nothing was persisted - there's no attempt to reference
    examType: 'practice' as const,
    title: config.title,
    duration: config.duration, // unused by the client for practice, kept for consistency
    totalQuestions: questions.length,
    startedAt: new Date().toISOString(),
    questions: clientQuestions,
  };
}

/** Mock: unchanged from the original design - hidden answers, shuffled
 * cross-subject composition, server-tracked Attempt for timing + scoring. */
async function startMockExam(userId: string, config: InstanceType<typeof ExamConfig>) {
  if (!config.subjectDistribution?.length) {
    throw new ApiError('Malformed mock exam config', 500);
  }

  const perSubjectResults = await Promise.all(
    config.subjectDistribution.map((sd: { subjectId: Types.ObjectId; count: number; }) => sampleQuestions(sd.subjectId as Types.ObjectId, sd.count))
  );
  const questions = shuffle(perSubjectResults.flat());

  if (questions.length < config.totalQuestions) {
    throw new ApiError(
      `Not enough active questions available (need ${config.totalQuestions}, have ${questions.length}). Please contact support.`,
      409,
      'INSUFFICIENT_QUESTIONS'
    );
  }

  const startedAt = new Date();

  const clientQuestions: MockClientQuestion[] = [];
  const answerSkeletons = questions.map((q) => {
    const optionIds = q.options.map((o: { id: any; }) => o.id);
    const orderedIds = config.shuffleOptions ? shuffle(optionIds) : optionIds;
    const optionsById = new Map<string, (typeof q.options)[number]>(
      q.options.map((o: { id: any; }) => [o.id, o])
    );

    clientQuestions.push({
      questionId: q._id.toString(),
      subjectId: q.subjectId.toString(),
      question: q.question,
      imageUrl: q.imageUrl,
      options: orderedIds.map((id: string) => {
        const o = optionsById.get(id)!;
        return { id: o.id, text: o.text, imageUrl: o.imageUrl };
      }),
    });

    return {
      questionId: q._id,
      subjectId: q.subjectId,
      optionOrder: orderedIds,
    };
  });

  const attempt = await Attempt.create({
    userId,
    examId: config._id,
    examType: config.examType,
    facultyId: config.facultyId,
    status: 'in-progress',
    allowedDuration: config.duration,
    startedAt,
    answers: answerSkeletons,
    totalQuestions: config.totalQuestions,
  });

  return {
    attemptId: attempt.id as string,
    examType: 'mock' as const,
    title: config.title,
    duration: config.duration,
    totalQuestions: config.totalQuestions,
    startedAt: startedAt.toISOString(),
    questions: clientQuestions,
  };
}