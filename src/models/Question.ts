import { Schema, model, models, Document, Types } from 'mongoose';

export interface IOption {
  id: string; // stable option id, e.g. "a" | "b" | "c" | "d" - NOT positional
  text: string;
  imageUrl?: string;
}

export interface IQuestion extends Document {
  facultyId: Types.ObjectId;
  subjectId: Types.ObjectId;
  chapter?: string;
  question: string;
  imageUrl?: string;
  options: IOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  isActive: boolean;
  createdAt: Date;
}

const OptionSchema = new Schema<IOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: false },
    imageUrl: { type: String },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>({
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  chapter: { type: String, index: true },
  question: { type: String, required: true },
  imageUrl: { type: String },
  options: { type: [OptionSchema], required: true },
  correctOptionId: { type: String, required: true },
  explanation: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Supports the $sample-based random pulls in exam.service.ts
QuestionSchema.index({ subjectId: 1, isActive: 1 });
QuestionSchema.index({ facultyId: 1, isActive: 1 });

export default models.Question || model<IQuestion>('Question', QuestionSchema);
