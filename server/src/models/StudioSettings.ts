import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IPaymentMilestone {
  description: string;
  percentage: number;
}

export interface ITaxConfig {
  enabled: boolean;
  type: 'exclusive' | 'inclusive';
  rate: number;
  isInterState: boolean;
}

export interface IStudioSettings extends Document {
  studioName: string;
  logoUrl: string;
  address: IAddress;
  phone: string;
  email: string;
  gstin?: string;
  defaultQuotationValidityDays: number;
  defaultTerms: string[];
  defaultInclusions: string[];
  defaultExclusions: string[];
  defaultPaymentMilestones: IPaymentMilestone[];
  currency: string;
  defaultTaxConfig: ITaxConfig;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const taxConfigSchema = new Schema<ITaxConfig>(
  {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
    rate: { type: Number, default: 18, min: 0, max: 100 },
    isInterState: { type: Boolean, default: false },
  },
  { _id: false }
);

const studioSettingsSchema = new Schema<IStudioSettings>(
  {
    studioName: {
      type: String,
      required: true,
      default: 'The Space Story',
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '/logo/TTS.png',
    },
    address: {
      type: addressSchema,
      default: () => ({
        line1: '',
        city: '',
        state: '',
        pincode: '',
      }),
    },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    gstin: { type: String, trim: true },
    defaultQuotationValidityDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365,
    },
    defaultTerms: {
      type: [String],
      default: [
        'Rates are subject to change based on site conditions.',
        'Any additional work not mentioned in this quotation will be charged separately.',
        'Transportation and handling charges are included unless stated otherwise.',
        'Work will commence upon confirmation and advance payment.',
      ],
    },
    defaultInclusions: {
      type: [String],
      default: [
        'Material and labour charges',
        'Basic hardware and fittings',
        'Site cleaning after completion',
      ],
    },
    defaultExclusions: {
      type: [String],
      default: [
        'Electrical and plumbing work unless specified',
        'Civil and masonry work',
        'Appliances and electronics',
        'Curtains and blinds',
      ],
    },
    defaultPaymentMilestones: {
      type: [
        {
          description: { type: String, required: true },
          percentage: { type: Number, required: true, min: 0, max: 100 },
        },
      ],
      default: [
        { description: 'Booking advance', percentage: 40 },
        { description: 'On material procurement', percentage: 30 },
        { description: 'On installation start', percentage: 20 },
        { description: 'On project completion', percentage: 10 },
      ],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    defaultTaxConfig: {
      type: taxConfigSchema,
      default: () => ({
        enabled: true,
        type: 'exclusive',
        rate: 18,
        isInterState: false,
      }),
    },
  },
  { timestamps: true }
);

export const StudioSettings = mongoose.model<IStudioSettings>(
  'StudioSettings',
  studioSettingsSchema
);
