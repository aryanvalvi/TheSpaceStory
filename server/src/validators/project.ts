import { z } from 'zod';
import { PROPERTY_TYPES, PROJECT_STATUSES } from '../models/Project.js';

const addressSchema = z.object({
  line1: z.string().max(300).optional().or(z.literal('')),
  line2: z.string().max(300).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pincode: z.string().max(20).optional().or(z.literal('')),
}).optional().nullable();

export const createProjectSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  projectName: z.string().min(1, 'Project name is required').max(300),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  siteAddress: addressSchema,
  carpetAreaSqFt: z.number().min(0).max(100000).optional(),
  projectNotes: z.string().max(5000).optional(),
});

export const updateProjectSchema = z.object({
  projectName: z.string().min(1).max(300).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  siteAddress: addressSchema,
  carpetAreaSqFt: z.number().min(0).max(100000).optional(),
  projectNotes: z.string().max(5000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const projectQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
