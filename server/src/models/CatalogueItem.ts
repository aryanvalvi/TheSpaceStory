import mongoose, { Schema, Document } from 'mongoose';

export const CATALOGUE_CATEGORIES = [
  'carpentry', 'modular_kitchen', 'furniture', 'false_ceiling',
  'electrical', 'plumbing', 'civil_work', 'painting',
  'flooring', 'lighting', 'furnishings', 'design_services',
  'site_supervision', 'other',
] as const;

export const UNITS = [
  'sqft', 'sqm', 'running_ft', 'running_m', 'ft', 'm',
  'piece', 'set', 'day', 'hour', 'visit', 'lot', 'fixed_amount',
] as const;

export const QUANTITY_FORMULAS = [
  'manual', 'length_x_width', 'length_x_height',
  'length_x_width_x_height', 'count_x_per_unit',
] as const;

export interface ICatalogueItem extends Document {
  name: string;
  category: (typeof CATALOGUE_CATEGORIES)[number];
  description?: string;
  defaultUnit: (typeof UNITS)[number];
  defaultRate: number;
  defaultTaxConfig?: {
    rate: number;
    type: 'exclusive' | 'inclusive';
  };
  defaultSpecifications?: string;
  defaultQuantityFormula: (typeof QUANTITY_FORMULAS)[number];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const catalogueItemSchema = new Schema<ICatalogueItem>(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: 300,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: CATALOGUE_CATEGORIES,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    defaultUnit: {
      type: String,
      required: true,
      enum: UNITS,
      default: 'sqft',
    },
    defaultRate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    defaultTaxConfig: {
      rate: { type: Number, min: 0, max: 100 },
      type: { type: String, enum: ['exclusive', 'inclusive'] },
    },
    defaultSpecifications: { type: String, trim: true, maxlength: 2000 },
    defaultQuantityFormula: {
      type: String,
      enum: QUANTITY_FORMULAS,
      default: 'manual',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

catalogueItemSchema.index({ category: 1 });
catalogueItemSchema.index({ active: 1 });
catalogueItemSchema.index({ name: 'text', description: 'text' });

export const CatalogueItem = mongoose.model<ICatalogueItem>(
  'CatalogueItem',
  catalogueItemSchema
);
