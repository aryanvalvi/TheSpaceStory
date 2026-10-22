import mongoose, { Schema, Document } from 'mongoose';

export const QUOTATION_STATUSES = [
  'draft', 'issued', 'approved', 'rejected', 'expired', 'cancelled',
] as const;

export interface IQuotationItem {
  itemId: string;
  catalogueItemId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  specifications?: string;
  unit: string;
  quantity: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    count?: number;
    perUnit?: number;
  };
  rate: number;
  taxConfig?: {
    rate: number;
    type: 'exclusive' | 'inclusive';
  };
  isOptional: boolean;
  isIncluded: boolean;
  calculationMethod: string;
  amount: number;
  order: number;
}

export interface IQuotationRoom {
  roomId: string;
  name: string;
  notes?: string;
  order: number;
  items: IQuotationItem[];
  subtotal: number;
}

export interface IDesignFee {
  description: string;
  feeType: 'fixed' | 'percentage' | 'per_sqft';
  amount: number;
  sqft?: number;
  ratePerSqft?: number;
  calculatedAmount: number;
  isTaxable: boolean;
}

export interface IAdditionalCharge {
  description: string;
  amount: number;
  isTaxable: boolean;
}

export interface IDiscountConfig {
  type: 'none' | 'fixed' | 'percentage';
  value: number;
  calculatedAmount: number;
}

export interface ITaxConfig {
  enabled: boolean;
  type: 'exclusive' | 'inclusive';
  rate: number;
  isInterState: boolean;
}

export interface IPaymentMilestone {
  description: string;
  percentage: number;
  amount: number;
}

export interface ICalculationSnapshot {
  roomsSubtotal: number;
  designFeesTotal: number;
  additionalChargesTotal: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  grandTotal: number;
}

export interface IQuotation extends Document {
  quotationNumber: string;
  projectId: mongoose.Types.ObjectId;
  clientSnapshot: {
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
  };
  projectSnapshot: {
    projectName: string;
    propertyType?: string;
    siteAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
    carpetAreaSqFt?: number;
  };
  revisionNumber: number;
  status: (typeof QUOTATION_STATUSES)[number];
  issueDate?: Date;
  validUntil?: Date;
  rooms: IQuotationRoom[];
  designFees: IDesignFee[];
  additionalCharges: IAdditionalCharge[];
  discountConfig: IDiscountConfig;
  taxConfig: ITaxConfig;
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  paymentMilestones: IPaymentMilestone[];
  calculationSnapshot: ICalculationSnapshot;
  previousRevisionId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  issuedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const discountConfigSchema = new Schema(
  {
    type: { type: String, enum: ['none', 'fixed', 'percentage'], default: 'none' },
    value: { type: Number, default: 0 },
    calculatedAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationTaxConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
    rate: { type: Number, default: 18 },
    isInterState: { type: Boolean, default: false },
  },
  { _id: false }
);

const calculationSnapshotSchema = new Schema(
  {
    roomsSubtotal: { type: Number, default: 0 },
    designFeesTotal: { type: Number, default: 0 },
    additionalChargesTotal: { type: Number, default: 0 },
    subtotalBeforeDiscount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotalAfterDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    cgst: Number,
    sgst: Number,
    igst: Number,
    grandTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    catalogueItemId: { type: Schema.Types.ObjectId, ref: 'CatalogueItem' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    specifications: { type: String, trim: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      count: Number,
      perUnit: Number,
    },
    rate: { type: Number, required: true, min: 0 },
    taxConfig: {
      rate: { type: Number, min: 0, max: 100 },
      type: { type: String, enum: ['exclusive', 'inclusive'] },
    },
    isOptional: { type: Boolean, default: false },
    isIncluded: { type: Boolean, default: true },
    calculationMethod: {
      type: String,
      default: 'manual',
    },
    amount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationRoomSchema = new Schema(
  {
    roomId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    order: { type: Number, default: 0 },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationSchema = new Schema<IQuotation>(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    clientSnapshot: {
      name: { type: String, required: true },
      phone: String,
      email: String,
      billingAddress: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String,
      },
    },
    projectSnapshot: {
      projectName: { type: String, required: true },
      propertyType: String,
      siteAddress: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        pincode: String,
      },
      carpetAreaSqFt: Number,
    },
    revisionNumber: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: 'draft',
    },
    issueDate: Date,
    validUntil: Date,
    rooms: [quotationRoomSchema],
    designFees: [
      {
        description: { type: String, required: true },
        feeType: { type: String, enum: ['fixed', 'percentage', 'per_sqft'], required: true },
        amount: { type: Number, required: true },
        sqft: { type: Number },
        ratePerSqft: { type: Number },
        calculatedAmount: { type: Number, default: 0 },
        isTaxable: { type: Boolean, default: true },
        _id: false,
      },
    ],
    additionalCharges: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        isTaxable: { type: Boolean, default: true },
        _id: false,
      },
    ],
    discountConfig: {
      type: discountConfigSchema,
      default: () => ({ type: 'none', value: 0, calculatedAmount: 0 }),
    },
    taxConfig: {
      type: quotationTaxConfigSchema,
      default: () => ({ enabled: true, type: 'exclusive', rate: 18, isInterState: false }),
    },
    inclusions: [{ type: String, trim: true }],
    exclusions: [{ type: String, trim: true }],
    terms: [{ type: String, trim: true }],
    paymentMilestones: [
      {
        description: { type: String, required: true },
        percentage: { type: Number, required: true, min: 0, max: 100 },
        amount: { type: Number, default: 0 },
        _id: false,
      },
    ],
    calculationSnapshot: {
      type: calculationSnapshotSchema,
      default: () => ({}),
    },
    previousRevisionId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedAt: Date,
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

quotationSchema.index({ projectId: 1, revisionNumber: -1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ createdAt: -1 });

export const Quotation = mongoose.model<IQuotation>('Quotation', quotationSchema);
