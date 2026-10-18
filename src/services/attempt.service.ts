import Attempt from '@/models/Attempt';
import ExamConfig from '@/models/ExamConfig';
import Question from '@/models/Question';
import { ApiError } from '@/lib/apiResponse';
import { upsertLeaderboardScore } from './leaderboard.service';

// Grace period on top of the exam's allowed duration, to absorb network
// latency between the client's own timer hitting zero and this request
// arriving - not meant to allow meaningfully extra time.
const DURATION_GRACE_SECONDS = 60;

interface SubmitAnswerInput {
  questionId: string;
  selectedOptionId?: string;
  timeTaken?: number;
}

export async function submitAttempt(
  userId: string,
  attemptId: string,
  clientAnswers: SubmitAnswerInput[]
) {
  const attempt = await Attempt.findOne({ _id: attemptId, userId });
  if (!attempt) throw new ApiError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');

  if (attempt.status !== 'in-progress') {
    throw new ApiError('This attempt has already been submitted', 409, 'ALREADY_SUBMITTED');
  }

  const config = await ExamConfig.findById(attempt.examId);
  if (!config) throw new ApiError('Exam configuration no longer exists', 500);

  // --- Server-side duration enforcement -----------------------------------
  const submittedAt = new Date();
  const actualDuration = Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);
  const allowedSeconds = attempt.allowedDuration * 60 + DURATION_GRACE_SECONDS;

  const withinTime = actualDuration <= allowedSeconds;
  // If they went over time, we still grade whatever was submitted rather
  // than rejecting outright - matches how real exams auto-submit at the
  // buzzer instead of discarding the paper.

  // --- Merge client answers onto the server-stored answer skeletons -------
  // We never trust selectedOptionId's correctness from the client's own
  // claim - we only trust *which option id* they picked, then check it
  // against correctOptionId ourselves. timeTaken is stored as-is for
  // analytics but never used in scoring.
  const clientAnswerMap = new Map(clientAnswers.map((a) => [a.questionId, a]));

  const questionIds = attempt.answers.map((a) => a.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } }).select(
    'correctOptionId'
  );
  const correctByQuestionId = new Map(questions.map((q) => [q.id, q.correctOptionId]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const ans of attempt.answers) {
    const qid = ans.questionId.toString();
    const clientAns = clientAnswerMap.get(qid);
    const selectedOptionId = clientAns?.selectedOptionId;

    ans.timeTaken = clientAns?.timeTaken;

    if (!selectedOptionId) {
      unanswered += 1;
      continue;
    }

    // Guard against a tampered/invalid option id that was never actually
    // shown to this user for this question.
    if (!ans.optionOrder.includes(selectedOptionId)) {
      unanswered += 1;
      continue;
    }

    ans.selectedOptionId = selectedOptionId;
    const isCorrect = correctByQuestionId.get(qid) === selectedOptionId;
    ans.isCorrect = isCorrect;

    if (isCorrect) correct += 1;
    else wrong += 1;
  }

  const score = correct * config.correctMarks - wrong * config.negativeMarks;

  attempt.status = withinTime ? 'submitted' : 'expired';
  attempt.submittedAt = submittedAt;
  attempt.actualDuration = actualDuration;
  attempt.score = score;
  attempt.correct = correct;
  attempt.wrong = wrong;
  attempt.unanswered = unanswered;

  await attempt.save();

  // Fire-and-forget: leaderboard update shouldn't block the response the
  // user is waiting on. Errors are logged, not surfaced - a failed
  // leaderboard update should never make submission itself look like it failed.
  upsertLeaderboardScore(attempt.examId.toString(), userId, score, actualDuration).catch((err) =>
    console.error('Leaderboard update failed:', err)
  );

  return {
    attemptId: attempt.id,
    score,
    totalQuestions: attempt.totalQuestions,
    correct,
    wrong,
    unanswered,
    actualDuration,
    status: attempt.status,
  };
}

export async function getAttemptResult(userId: string, attemptId: string) {
  const attempt = await Attempt.findOne({ _id: attemptId, userId }).lean();
  if (!attempt) throw new ApiError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');

  if (attempt.status === 'in-progress') {
    throw new ApiError('Attempt has not been submitted yet', 409, 'NOT_SUBMITTED');
  }

  // Explanations and correct answers are only revealed here, post-submission.
  const questionIds = attempt.answers.map((a) => a.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } })
    .select('question imageUrl options correctOptionId explanation subjectId')
    .lean();
  const questionById = new Map(questions.map((q) => [q._id.toString(), q]));

  // Subject-wise breakdown - free to compute since subjectId is already
  // tagged per-answer from exam start time.
  const bySubject = new Map<string, { correct: number; wrong: number; unanswered: number; total: number }>();

  const reviewItems = attempt.answers.map((a) => {
    const q = questionById.get(a.questionId.toString());
    const subjectKey = a.subjectId.toString();
    const bucket = bySubject.get(subjectKey) ?? { correct: 0, wrong: 0, unanswered: 0, total: 0 };
    bucket.total += 1;
    if (a.isCorrect === true) bucket.correct += 1;
    else if (a.selectedOptionId) bucket.wrong += 1;
    else bucket.unanswered += 1;
    bySubject.set(subjectKey, bucket);

    return {
      questionId: a.questionId.toString(),
      question: q?.question,
      imageUrl: q?.imageUrl,
      options: q?.options,
      correctOptionId: q?.correctOptionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: a.isCorrect,
      explanation: q?.explanation,
    };
  });

  return {
    attemptId: attempt._id.toString(),
    examType: attempt.examType,
    status: attempt.status,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    correct: attempt.correct,
    wrong: attempt.wrong,
    unanswered: attempt.unanswered,
    actualDuration: attempt.actualDuration,
    allowedDuration: attempt.allowedDuration,
    subjectBreakdown: Object.fromEntries(bySubject),
    review: reviewItems,
  };
}