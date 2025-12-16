import { z } from 'zod';

/**
 * Certification validation schemas
 */

// Create certification schema
export const createCertificationSchema = z.object({
  certification: z
    .string()
    .min(2, 'Certification name is required')
    .max(200, 'Certification name must not exceed 200 characters')
    .transform((val) => val.trim()),

  issuing_organization: z
    .string()
    .max(200, 'Issuing organization must not exceed 200 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  issue_date: z
    .string()
    .optional()
    .nullable(),

  expiry_date: z
    .string()
    .optional()
    .nullable(),

  credential_id: z
    .string()
    .max(100, 'Credential ID must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

// Update certification schema (all fields optional)
export const updateCertificationSchema = createCertificationSchema.partial();

// Types
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type UpdateCertificationInput = z.infer<typeof updateCertificationSchema>;
