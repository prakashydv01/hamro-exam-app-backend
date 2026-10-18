import { Schema, model, models, Document, Types } from 'mongoose';

export interface ISubjectDistribution {
  subjectId: Types.ObjectId;
  count: number;
}

export interface IExamConfig extends Document {
  facultyId: Types.ObjectId;
  examType: 'practice' | 'mock';
  title: string;

  // practice only - single subject, questions pulled from it
  subjectId?: Types.ObjectId;

  // mock only - composed across multiple subjects
  subjectDistribution?: ISubjectDistribution[];

  totalQuestions: number;
  duration: number; // minutes
  correctMarks: number;
  negativeMarks: number; // 0 if no negative marking
  shuffleOptions: boolean;
  isActive: boolean;
}

const SubjectDistributionSchema = new Schema<ISubjectDistribution>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    count: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ExamConfigSchema = new Schema<IExamConfig>({
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  examType: { type: String, enum: ['practice', 'mock'], required: true },
  title: { type: String, required: true },

  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  subjectDistribution: { type: [SubjectDistributionSchema] },

  totalQuestions: { type: Number, required: true },
  duration: { type: Number, required: true },
  correctMarks: { type: Number, required: true, default: 1 },
  negativeMarks: { type: Number, required: true, default: 0 },
  shuffleOptions: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
});

// Validation matching what we discussed: a mock exam's subjectDistribution
// counts must sum to totalQuestions, and practice needs subjectId while
// mock needs subjectDistribution. Enforced here so bad admin data can't
// slip in regardless of which route creates/edits it.
ExamConfigSchema.pre('validate', function (next) {
  if (this.examType === 'practice' && !this.subjectId) {
    return next(new Error('practice exams require subjectId'));
  }
  if (this.examType === 'mock') {
    if (!this.subjectDistribution || this.subjectDistribution.length === 0) {
      return next(new Error('mock exams require subjectDistribution'));
    }
    const sum = this.subjectDistribution.reduce((acc, s) => acc + s.count, 0);
    if (sum !== this.totalQuestions) {
      return next(
        new Error(
          `subjectDistribution counts (${sum}) must sum to totalQuestions (${this.totalQuestions})`
        )
      );
    }
  }
  next();
});

export default models.ExamConfig || model<IExamConfig>('ExamConfig', ExamConfigSchema);
