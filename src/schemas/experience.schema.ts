import { z } from 'zod';

/**
 * Work Experience validation schemas
 */

// Create experience schema
export const createExperienceSchema = z.object({
  position: z
    .string()
    .min(2, 'Position is required')
    .max(200, 'Position must not exceed 200 characters')
    .transform((val) => val.trim()),

  facility: z
    .string()
    .min(2, 'Facility is required')
    .max(200, 'Facility must not exceed 200 characters')
    .transform((val) => val.trim()),

  start_date: z
    .string()
    .optional()
    .nullable(),

  end_date: z
    .string()
    .optional()
    .nullable(),

  duration: z
    .string()
    .max(100, 'Duration must not exceed 100 characters')
    .transform((val) => val.trim()),

  is_current: z
    .boolean()
    .optional()
    .default(false),
});

// Update experience schema (all fields optional)
export const updateExperienceSchema = createExperienceSchema.partial();

// Helper function to calculate duration
export function calculateDuration(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
}

// Types
export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
