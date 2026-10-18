/**
 * Bootstraps minimal dev data so you can hit the API end-to-end immediately:
 * one category, one faculty, two subjects, a handful of questions, and both
 * a practice exam config and a mock exam config.
 *
 * Run with: npm run seed   (requires MONGODB_URI in .env.local)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Category, Faculty, Subject } from '../src/models/Taxonomy';
import Question from '../src/models/Question';
import ExamConfig from '../src/models/ExamConfig';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const category = await Category.findOneAndUpdate(
    { slug: 'engineering-entrance' },
    { name: 'Engineering Entrance', slug: 'engineering-entrance', isActive: true },
    { upsert: true, new: true }
  );

  const faculty = await Faculty.findOneAndUpdate(
    { slug: 'ioe' },
    { categoryId: category._id, name: 'IOE', slug: 'ioe', isActive: true },
    { upsert: true, new: true }
  );

  const physics = await Subject.findOneAndUpdate(
    { facultyId: faculty._id, slug: 'physics' },
    { facultyId: faculty._id, name: 'Physics', slug: 'physics', isActive: true },
    { upsert: true, new: true }
  );

  const math = await Subject.findOneAndUpdate(
    { facultyId: faculty._id, slug: 'math' },
    { facultyId: faculty._id, name: 'Mathematics', slug: 'math', isActive: true },
    { upsert: true, new: true }
  );

  // A few sample questions per subject - replace with real content via the
  // admin dashboard. Enough here to exercise $sample meaningfully.
  const makeQuestions = (subjectId: any, prefix: string, n: number) =>
    Array.from({ length: n }).map((_, i) => ({
      facultyId: faculty._id,
      subjectId,
      question: `${prefix} sample question ${i + 1}?`,
      options: [
        { id: 'a', text: `Option A (${i + 1})` },
        { id: 'b', text: `Option B (${i + 1})` },
        { id: 'c', text: `Option C (${i + 1})` },
        { id: 'd', text: `Option D (${i + 1})` },
      ],
      correctOptionId: 'a',
      explanation: `Explanation for ${prefix} question ${i + 1}.`,
      difficulty: 'medium',
      isActive: true,
    }));

  await Question.deleteMany({ facultyId: faculty._id });
  await Question.insertMany(makeQuestions(physics._id, 'Physics', 30));
  await Question.insertMany(makeQuestions(math._id, 'Math', 30));
  console.log('Seeded 60 sample questions');

  await ExamConfig.findOneAndUpdate(
    { title: 'Physics Practice', facultyId: faculty._id },
    {
      facultyId: faculty._id,
      examType: 'practice',
      title: 'Physics Practice',
      subjectId: physics._id,
      totalQuestions: 10,
      duration: 15,
      correctMarks: 1,
      negativeMarks: 0,
      shuffleOptions: true,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  await ExamConfig.findOneAndUpdate(
    { title: 'IOE Mock Test 1', facultyId: faculty._id },
    {
      facultyId: faculty._id,
      examType: 'mock',
      title: 'IOE Mock Test 1',
      subjectDistribution: [
        { subjectId: physics._id, count: 15 },
        { subjectId: math._id, count: 15 },
      ],
      totalQuestions: 30,
      duration: 45,
      correctMarks: 1,
      negativeMarks: 0.25,
      shuffleOptions: true,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  console.log('Seeded practice + mock exam configs');
  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
