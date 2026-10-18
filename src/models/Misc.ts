import { Schema, model, models, Document, Types } from 'mongoose';

export interface IBookmark extends Document {
  userId: Types.ObjectId;
  questionId: Types.ObjectId;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  createdAt: { type: Date, default: Date.now },
});
BookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });

/**
 * Materialized "best score per user per exam" - kept separate from the raw
 * `attempts` log so leaderboard reads are a single indexed query rather than
 * an aggregation over every attempt ever made. Upserted (only if improved)
 * right after a submission, in the background.
 */
export interface ILeaderboardScore extends Document {
  examId: Types.ObjectId;
  userId: Types.ObjectId;
  bestScore: number;
  bestActualDuration: number; // seconds - tiebreaker, faster is better
  attemptsCount: number;
  updatedAt: Date;
}

const LeaderboardScoreSchema = new Schema<ILeaderboardScore>({
  examId: { type: Schema.Types.ObjectId, ref: 'ExamConfig', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bestScore: { type: Number, required: true },
  bestActualDuration: { type: Number, required: true },
  attemptsCount: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now },
});
LeaderboardScoreSchema.index({ examId: 1, userId: 1 }, { unique: true });
// Powers "top N" queries directly off the index, no in-memory sort needed.
LeaderboardScoreSchema.index({ examId: 1, bestScore: -1, bestActualDuration: 1 });

export const Bookmark = models.Bookmark || model<IBookmark>('Bookmark', BookmarkSchema);
export const LeaderboardScore =
  models.LeaderboardScore || model<ILeaderboardScore>('LeaderboardScore', LeaderboardScoreSchema);
