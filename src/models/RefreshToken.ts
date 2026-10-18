import { Schema, model, models, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jti: { type: String, required: true, unique: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Mongo TTL index - automatically deletes expired refresh token docs.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.RefreshToken || model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
