import { Schema, model, models, Document, Types } from 'mongoose';

/**
 * Category -> Faculty -> Subject hierarchy.
 * Category examples: "Engineering Entrance", "Loksewa", "SEE", "+2 Entrance", "Banking"
 * Faculty examples (under Engineering Entrance): "IOE", "CSIT", "BCA", "BIT"
 * Faculty examples (under Loksewa): "Kharidar", "Nayab Subba"
 *
 * Kept as separate top-level collections (not embedded) so the admin
 * dashboard can add a new category/faculty/subject as a pure data
 * operation - no schema or code changes required.
 */

export interface ICategory extends Document {
  name: string;
  slug: string;
  isActive: boolean;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
});

export interface IFaculty extends Document {
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
}

const FacultySchema = new Schema<IFaculty>({
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
});

export interface ISubject extends Document {
  facultyId: Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
}

const SubjectSchema = new Schema<ISubject>({
  facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true },
  isActive: { type: Boolean, default: true },
});
SubjectSchema.index({ facultyId: 1, slug: 1 }, { unique: true });

export const Category = models.Category || model<ICategory>('Category', CategorySchema);
export const Faculty = models.Faculty || model<IFaculty>('Faculty', FacultySchema);
export const Subject = models.Subject || model<ISubject>('Subject', SubjectSchema);
