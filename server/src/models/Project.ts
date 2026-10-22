import mongoose, { Schema, Document } from 'mongoose';

export const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'cancelled'] as const;
export const PROPERTY_TYPES = ['apartment', 'villa', 'office', 'retail', 'other'] as const;

export interface IProject extends Document {
  clientId: mongoose.Types.ObjectId;
  projectName: string;
  propertyType?: (typeof PROPERTY_TYPES)[number];
  siteAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  carpetAreaSqFt?: number;
  projectNotes?: string;
  status: (typeof PROJECT_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 300,
    },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      default: 'apartment',
    },
    siteAddress: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    carpetAreaSqFt: {
      type: Number,
      min: 0,
      max: 100000,
    },
    projectNotes: { type: String, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'active',
    },
  },
  { timestamps: true }
);

projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
