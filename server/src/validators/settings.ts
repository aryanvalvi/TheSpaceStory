import { z } from 'zod';

export const updateStudioSettingsSchema = z.object({
  studioName: z.string().min(1).max(200).optional(),
  logoUrl: z.string().optional(),
  address: z.object({
    line1: z.string().max(300).optional().or(z.literal('')),
    line2: z.string().max(300).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    state: z.string().max(100).optional().or(z.literal('')),
    pincode: z.string().max(20).optional().or(z.literal('')),
  }).optional().nullable(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().max(20).optional().or(z.literal('')),
  defaultQuotationValidityDays: z.number().min(1).max(365).optional(),
  defaultTerms: z.array(z.string()).optional(),
  defaultInclusions: z.array(z.string()).optional(),
  defaultExclusions: z.array(z.string()).optional(),
  defaultPaymentMilestones: z.array(z.object({
    description: z.string().min(1),
    percentage: z.number().min(0).max(100),
  })).optional(),
  currency: z.string().optional(),
  defaultTaxConfig: z.object({
    enabled: z.boolean(),
    type: z.enum(['exclusive', 'inclusive']),
    rate: z.number().min(0).max(100),
    isInterState: z.boolean(),
  }).optional(),
});

export type UpdateStudioSettingsInput = z.infer<typeof updateStudioSettingsSchema>;
