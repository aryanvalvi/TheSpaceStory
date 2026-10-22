import { z } from 'zod';

const dimensionsSchema = z.object({
  length: z.number().min(0).max(10000).optional(),
  width: z.number().min(0).max(10000).optional(),
  height: z.number().min(0).max(10000).optional(),
  count: z.number().min(0).max(100000).optional(),
  perUnit: z.number().min(0).max(100000).optional(),
}).optional();

const quotationItemSchema = z.object({
  itemId: z.string().min(1),
  catalogueItemId: z.string().optional(),
  name: z.string().min(1, 'Item name is required').max(300),
  description: z.string().max(2000).optional(),
  specifications: z.string().max(2000).optional(),
  unit: z.string().min(1),
  quantity: z.number().min(0).max(100000),
  dimensions: dimensionsSchema,
  rate: z.number().min(0),
  taxConfig: z.object({
    rate: z.number().min(0).max(100),
    type: z.enum(['exclusive', 'inclusive']),
  }).optional(),
  isOptional: z.boolean().default(false),
  isIncluded: z.boolean().default(true),
  calculationMethod: z.string().default('manual'),
  amount: z.number().default(0),
  order: z.number().default(0),
});

const quotationRoomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1, 'Room name is required').max(200),
  notes: z.string().max(2000).optional(),
  order: z.number().default(0),
  items: z.array(quotationItemSchema).default([]),
  subtotal: z.number().default(0),
});

const designFeeSchema = z.object({
  description: z.string().min(1),
  feeType: z.enum(['fixed', 'percentage', 'per_sqft']),
  amount: z.number().min(0),
  calculatedAmount: z.number().default(0),
  isTaxable: z.boolean().default(true),
});

const additionalChargeSchema = z.object({
  description: z.string().min(1),
  amount: z.number().min(0),
  isTaxable: z.boolean().default(true),
});

const discountConfigSchema = z.object({
  type: z.enum(['none', 'fixed', 'percentage']).default('none'),
  value: z.number().min(0).default(0),
  calculatedAmount: z.number().default(0),
});

const taxConfigSchema = z.object({
  enabled: z.boolean().default(true),
  type: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  rate: z.number().min(0).max(100).default(18),
  isInterState: z.boolean().default(false),
});

const paymentMilestoneSchema = z.object({
  description: z.string().min(1),
  percentage: z.number().min(0).max(100),
  amount: z.number().default(0),
});

export const createQuotationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  rooms: z.array(quotationRoomSchema).default([]),
  designFees: z.array(designFeeSchema).default([]),
  additionalCharges: z.array(additionalChargeSchema).default([]),
  discountConfig: discountConfigSchema.default({ type: 'none', value: 0, calculatedAmount: 0 }),
  taxConfig: taxConfigSchema.default({ enabled: true, type: 'exclusive', rate: 18, isInterState: false }),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  paymentMilestones: z.array(paymentMilestoneSchema).default([]),
  validUntil: z.string().datetime().optional(),
});

export const updateQuotationSchema = createQuotationSchema.partial().extend({
  version: z.number().min(1, 'Version is required for updates'),
});

export const calculateQuotationSchema = z.object({
  rooms: z.array(quotationRoomSchema).default([]),
  designFees: z.array(designFeeSchema).default([]),
  additionalCharges: z.array(additionalChargeSchema).default([]),
  discountConfig: discountConfigSchema.default({ type: 'none', value: 0, calculatedAmount: 0 }),
  taxConfig: taxConfigSchema.default({ enabled: true, type: 'exclusive', rate: 18, isInterState: false }),
  paymentMilestones: z.array(paymentMilestoneSchema).default([]),
  carpetAreaSqFt: z.number().min(0).optional(),
});

export const quotationQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type CalculateQuotationInput = z.infer<typeof calculateQuotationSchema>;
