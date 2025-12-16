import { z } from 'zod';

/**
 * Job validation schemas
 * Mirrors frontend validation from healthjobsph
 */

// Employment types
export const employmentTypes = [
  'full-time',
  'part-time',
  'contract',
  'per-diem',
] as const;

// Experience levels
export const experienceLevels = [
  'entry-level',
  'mid-level',
  'senior-level',
  'expert-level',
] as const;

// Job statuses
export const jobStatuses = [
  'active',
  'pending',
  'closed',
  'expired',
] as const;

// Facility types
export const facilityTypes = [
  'Hospital',
  'Clinic',
  'Nursing Home',
  'Diagnostic Center',
  'Pharmacy',
  'Other',
] as const;

// Job categories (healthcare professions)
export const jobCategories = [
  'Registered Nurse',
  'Medical Doctor',
  'Medical Technologist',
  'Pharmacist',
  'Physical Therapist',
  'Radiologic Technologist',
  'Respiratory Therapist',
  'Nursing Assistant',
  'Healthcare Support',
  'Other',
] as const;

// Create job schema
export const createJobSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must not exceed 200 characters')
    .transform((val) => val.trim()),

  department: z
    .string()
    .max(100, 'Department must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  location: z
    .string()
    .min(2, 'Location is required')
    .max(200, 'Location must not exceed 200 characters')
    .transform((val) => val.trim()),

  employment_type: z.enum(employmentTypes, {
    errorMap: () => ({ message: 'Invalid employment type' }),
  }),

  category: z
    .string()
    .min(2, 'Category is required')
    .max(100, 'Category must not exceed 100 characters')
    .transform((val) => val.trim()),

  experience: z.enum(experienceLevels, {
    errorMap: () => ({ message: 'Invalid experience level' }),
  }),

  salary_min: z
    .number()
    .positive('Minimum salary must be positive')
    .max(100000000, 'Salary seems too high')
    .optional()
    .nullable(),

  salary_max: z
    .number()
    .positive('Maximum salary must be positive')
    .max(100000000, 'Salary seems too high')
    .optional()
    .nullable(),

  salary_display: z
    .string()
    .max(100, 'Salary display must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  facility_type: z
    .string()
    .min(1, 'Facility type is required')
    .max(100, 'Facility type must not exceed 100 characters')
    .transform((val) => val.trim()),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must not exceed 10000 characters')
    .transform((val) => val.trim()),

  status: z.enum(jobStatuses).optional().default('pending'),

  is_urgent: z.boolean().optional().default(false),

  rank: z.number().int().min(0).max(100).optional().default(0),

  spend_limit: z
    .number()
    .positive('Spend limit must be positive')
    .optional()
    .nullable(),

  expiry_date: z
    .string()
    .datetime({ message: 'Invalid expiry date format' })
    .optional()
    .nullable(),

  deadline: z
    .string()
    .datetime({ message: 'Invalid deadline format' })
    .optional()
    .nullable(),

  // Related data (arrays of strings)
  requirements: z
    .array(z.string().min(1).max(500))
    .max(20, 'Cannot have more than 20 requirements')
    .optional()
    .default([]),

  benefits: z
    .array(z.string().min(1).max(500))
    .max(20, 'Cannot have more than 20 benefits')
    .optional()
    .default([]),

  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([]),
}).refine(
  (data) => {
    if (data.salary_min && data.salary_max) {
      return data.salary_min <= data.salary_max;
    }
    return true;
  },
  {
    message: 'Minimum salary cannot exceed maximum salary',
    path: ['salary_min'],
  }
);

// Base job schema without refinement (for partial)
const baseJobSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must not exceed 200 characters')
    .transform((val) => val.trim()),

  department: z
    .string()
    .max(100, 'Department must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  location: z
    .string()
    .min(2, 'Location is required')
    .max(200, 'Location must not exceed 200 characters')
    .transform((val) => val.trim()),

  employment_type: z.enum(employmentTypes, {
    errorMap: () => ({ message: 'Invalid employment type' }),
  }),

  category: z
    .string()
    .min(2, 'Category is required')
    .max(100, 'Category must not exceed 100 characters')
    .transform((val) => val.trim()),

  experience: z.enum(experienceLevels, {
    errorMap: () => ({ message: 'Invalid experience level' }),
  }),

  salary_min: z
    .number()
    .positive('Minimum salary must be positive')
    .max(100000000, 'Salary seems too high')
    .optional()
    .nullable(),

  salary_max: z
    .number()
    .positive('Maximum salary must be positive')
    .max(100000000, 'Salary seems too high')
    .optional()
    .nullable(),

  salary_display: z
    .string()
    .max(100, 'Salary display must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  facility_type: z
    .string()
    .min(1, 'Facility type is required')
    .max(100, 'Facility type must not exceed 100 characters')
    .transform((val) => val.trim()),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must not exceed 10000 characters')
    .transform((val) => val.trim()),

  status: z.enum(jobStatuses).optional().default('pending'),

  is_urgent: z.boolean().optional().default(false),

  rank: z.number().int().min(0).max(100).optional().default(0),

  spend_limit: z
    .number()
    .positive('Spend limit must be positive')
    .optional()
    .nullable(),

  expiry_date: z
    .string()
    .datetime({ message: 'Invalid expiry date format' })
    .optional()
    .nullable(),

  deadline: z
    .string()
    .datetime({ message: 'Invalid deadline format' })
    .optional()
    .nullable(),

  requirements: z
    .array(z.string().min(1).max(500))
    .max(20, 'Cannot have more than 20 requirements')
    .optional()
    .default([]),

  benefits: z
    .array(z.string().min(1).max(500))
    .max(20, 'Cannot have more than 20 benefits')
    .optional()
    .default([]),

  tags: z
    .array(z.string().min(1).max(50))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([]),
});

// Update job schema (all fields optional)
export const updateJobSchema = baseJobSchema.partial();

// Job filters schema for search/listing
export const jobFiltersSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().default(1)),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100).default(20)),

  search: z
    .string()
    .max(200, 'Search query too long')
    .optional()
    .transform((val) => val?.trim() || undefined),

  category: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || undefined),

  location: z
    .string()
    .max(200)
    .optional()
    .transform((val) => val?.trim() || undefined),

  employment_type: z
    .enum(employmentTypes)
    .optional(),

  experience: z
    .enum(experienceLevels)
    .optional(),

  facility_type: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim() || undefined),
});

// Types
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type JobFilters = z.infer<typeof jobFiltersSchema>;
