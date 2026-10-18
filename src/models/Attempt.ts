import { Schema, model, models, Document, Types } from 'mongoose';

export interface IAnswer {
  questionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  optionOrder: string[]; // shuffled option-id order shown to this user, for grading + review
  selectedOptionId?: string; // undefined = unanswered
  isCorrect?: boolean;
  timeTaken?: number; // seconds - client-reported, analytics only, never trusted for scoring
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  examId: Types.ObjectId;
  examType: 'practice' | 'mock';
  facultyId: Types.ObjectId;

  status: 'in-progress' | 'submitted' | 'expired';

  allowedDuration: number; // minutes, snapshotted from ExamConfig at start time
  startedAt: Date; // set server-side
  submittedAt?: Date; // set server-side
  actualDuration?: number; // seconds, computed server-side

  answers: IAnswer[];

  score?: number;
  totalQuestions: number;
  correct?: number;
  wrong?: number;
  unanswered?: number;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    optionOrder: { type: [String], required: true },
    selectedOptionId: { type: String },
    isCorrect: { type: Boolean },
    timeTaken: { type: Number },
  },
  { _id: false }
);

const AttemptSchema = new Schema<IAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  examId: { type: Schema.Types.ObjectId, ref: 'ExamConfig', required: true, index: true },
  examType: { type: String, enum: ['practice', 'mock'], required: true },
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },

  status: { type: String, enum: ['in-progress', 'submitted', 'expired'], default: 'in-progress' },

  allowedDuration: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date },
  actualDuration: { type: Number },

  answers: { type: [AnswerSchema], required: true },

  score: { type: Number },
  totalQuestions: { type: Number, required: true },
  correct: { type: Number },
  wrong: { type: Number },
  unanswered: { type: Number },
});

AttemptSchema.index({ userId: 1, createdAt: -1 });
AttemptSchema.index({ examId: 1, score: -1 });

export default models.Attempt || model<IAttempt>('Attempt', AttemptSchema);
