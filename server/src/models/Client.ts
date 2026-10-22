import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  phone?: string;
  email?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: 200,
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    billingAddress: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

clientSchema.index({ name: 'text', email: 'text', phone: 'text' });
clientSchema.index({ createdAt: -1 });

export const Client = mongoose.model<IClient>('Client', clientSchema);
