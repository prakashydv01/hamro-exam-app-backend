import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  // Nepal phone numbers: 10 digits, commonly starting with 9 (mobile)
  phone: z.string().regex(/^9\d{9}$/, 'Enter a valid 10-digit Nepal phone number'),
  password: z.string().min(8).max(72),
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  otp: z.string().length(6),
});

export const resendOtpSchema = z.object({
  userId: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(72),
});

export const startExamSchema = z.object({
  examId: z.string().min(1),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().optional(),
  timeTaken: z.number().min(0).optional(),
});

export const submitExamSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(submitAnswerSchema),
});

export const bookmarkSchema = z.object({
  questionId: z.string().min(1),
});

// --- Question bulk import ---
// An option can be:
//   - a plain string, e.g. "at"                          -> text-only option
//   - an object with imageUrl (and optional text)          -> image option
// This covers both normal MCQs and image-based ones (mirror/water images,
// sequences, matrices - common in non-verbal reasoning questions).
const optionInputSchema = z.union([
  z.string().min(1),
  z
    .object({
      text: z.string().optional(),
      imageUrl: z.string().url().optional(),
    })
    .refine((o) => !!o.text || !!o.imageUrl, {
      message: 'Each option object must have text and/or imageUrl',
    }),
]);

// subjectId/facultyId are NOT part of the pasted JSON - they come from the
// faculty/subject dropdowns on the same form, so every question in a batch
// belongs to one subject.
export const questionImportItemSchema = z
  .object({
    question: z.string().min(1),
    imageUrl: z.string().url().optional(),
    options: z.array(optionInputSchema).min(2),
    correctAnswer: z.number().int().min(0),
    chapter: z.string().optional(),
    explanation: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((item) => item.correctAnswer < item.options.length, {
    message: 'correctAnswer index is out of range for the given options',
    path: ['correctAnswer'],
  });

export const bulkQuestionImportSchema = z.array(questionImportItemSchema).min(1);

/** Parses and throws a formatted ApiError-friendly message on failure. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(message);
  }
  return result.data;
}