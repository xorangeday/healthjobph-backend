import { z } from 'zod';

/**
 * Application validation schemas
 * Mirrors frontend validation from healthjobsph/services/applicationsService.ts
 */

// Application statuses
export const applicationStatuses = [
  'applied',
  'under-review',
  'interview-scheduled',
  'offered',
  'rejected',
] as const;

// Max lengths (matching frontend security.ts)
const MAX_LENGTHS = {
  cover_letter: 5000,
  resume_url: 2048,
  notes: 2000,
};

// Schema for creating an application (job seeker)
export const createApplicationSchema = z.object({
  job_id: z
    .string()
    .uuid('Invalid job ID format'),

  cover_letter: z
    .string()
    .max(MAX_LENGTHS.cover_letter, `Cover letter must not exceed ${MAX_LENGTHS.cover_letter} characters`)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  resume_url: z
    .string()
    .url('Invalid resume URL format')
    .max(MAX_LENGTHS.resume_url, `Resume URL must not exceed ${MAX_LENGTHS.resume_url} characters`)
    .optional()
    .nullable(),
});

// Schema for updating application status (employer)
export const updateApplicationStatusSchema = z.object({
  status: z.enum(applicationStatuses, {
    errorMap: () => ({ message: 'Invalid application status' }),
  }),

  notes: z
    .string()
    .max(MAX_LENGTHS.notes, `Notes must not exceed ${MAX_LENGTHS.notes} characters`)
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

// Schema for checking if applied
export const checkAppliedSchema = z.object({
  job_id: z.string().uuid('Invalid job ID format'),
});

// Schema for getting applications by job
export const getByJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

// Types
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type ApplicationStatus = (typeof applicationStatuses)[number];
