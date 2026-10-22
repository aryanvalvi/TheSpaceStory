import { z } from 'zod';
import { CATALOGUE_CATEGORIES, UNITS, QUANTITY_FORMULAS } from '../models/CatalogueItem.js';

export const createCatalogueItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(300),
  category: z.enum(CATALOGUE_CATEGORIES),
  description: z.string().max(2000).optional(),
  defaultUnit: z.enum(UNITS),
  defaultRate: z.number().min(0, 'Rate must be non-negative'),
  defaultTaxConfig: z.object({
    rate: z.number().min(0).max(100),
    type: z.enum(['exclusive', 'inclusive']),
  }).optional(),
  defaultSpecifications: z.string().max(2000).optional(),
  defaultQuantityFormula: z.enum(QUANTITY_FORMULAS).optional(),
});

export const updateCatalogueItemSchema = createCatalogueItemSchema.partial().extend({
  active: z.boolean().optional(),
});

export const catalogueQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  active: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
});

export type CreateCatalogueItemInput = z.infer<typeof createCatalogueItemSchema>;
export type UpdateCatalogueItemInput = z.infer<typeof updateCatalogueItemSchema>;
