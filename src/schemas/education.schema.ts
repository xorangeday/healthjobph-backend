import { z } from 'zod';

/**
 * Education validation schemas
 */

export const degreeTypes = [
  'High School Diploma',
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate Degree',
  'Certificate',
  'Diploma',
  'Other',
] as const;

// Create education schema
export const createEducationSchema = z.object({
  degree: z
    .string()
    .min(2, 'Degree is required')
    .max(200, 'Degree must not exceed 200 characters')
    .transform((val) => val.trim()),

  school: z
    .string()
    .min(2, 'School is required')
    .max(200, 'School must not exceed 200 characters')
    .transform((val) => val.trim()),

  year: z
    .string()
    .min(4, 'Year is required')
    .max(20, 'Year must not exceed 20 characters')
    .transform((val) => val.trim()),

  honors: z
    .string()
    .max(200, 'Honors must not exceed 200 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

// Update education schema (all fields optional)
export const updateEducationSchema = createEducationSchema.partial();

// Types
export type CreateEducationInput = z.infer<typeof createEducationSchema>;
export type UpdateEducationInput = z.infer<typeof updateEducationSchema>;
