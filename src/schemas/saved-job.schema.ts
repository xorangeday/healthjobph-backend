import { z } from 'zod';

/**
 * Saved Job validation schemas
 */

// Save job schema
export const saveJobSchema = z.object({
  job_id: z
    .string()
    .uuid('Invalid job ID format'),
});

// Types
export type SaveJobInput = z.infer<typeof saveJobSchema>;
