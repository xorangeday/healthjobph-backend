import { z } from 'zod';

/**
 * Profile validation schemas
 * Mirrors frontend validation from healthjobsph/lib/schemas/profile.ts
 */

// Experience levels
export const experienceLevels = [
  'entry-level',
  'mid-level',
  'senior-level',
  'expert-level',
] as const;

// Availability/employment types
export const availabilityTypes = [
  'full-time',
  'part-time',
  'contract',
  'per-diem',
] as const;

// Healthcare professions
export const healthcareProfessions = [
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

// Base profile schema for creation/update
export const profileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .transform((val) => val.trim()),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .transform((val) => val.trim()),

  phone: z
    .string()
    .regex(/^(\+63|0)?[0-9]{10,11}$/, 'Please enter a valid Philippine phone number')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  profession: z
    .string()
    .min(2, 'Profession is required')
    .max(100, 'Profession must not exceed 100 characters')
    .transform((val) => val.trim()),

  experience: z
    .enum(experienceLevels, {
      errorMap: () => ({ message: 'Please select a valid experience level' }),
    })
    .optional()
    .nullable(),

  location: z
    .string()
    .min(2, 'Location is required')
    .max(200, 'Location must not exceed 200 characters')
    .transform((val) => val.trim()),

  bio: z
    .string()
    .max(2000, 'Bio must not exceed 2000 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  availability: z
    .enum(availabilityTypes, {
      errorMap: () => ({ message: 'Please select a valid availability type' }),
    })
    .optional()
    .nullable(),

  expected_salary: z
    .number()
    .positive('Expected salary must be a positive number')
    .max(10000000, 'Expected salary seems too high')
    .optional()
    .nullable(),
});

// Schema for updating profile (all fields optional)
export const updateProfileSchema = profileSchema.partial();

// Schema for creating profile (required fields enforced)
export const createProfileSchema = z.object({
  first_name: profileSchema.shape.first_name,
  last_name: profileSchema.shape.last_name,
  profession: profileSchema.shape.profession,
  experience: profileSchema.shape.experience,
  location: profileSchema.shape.location,
  phone: profileSchema.shape.phone.optional(),
  bio: profileSchema.shape.bio.optional(),
  availability: profileSchema.shape.availability.optional(),
  expected_salary: profileSchema.shape.expected_salary.optional(),
});

// Request validation schemas (for middleware)
export const getProfileByIdSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export const updateProfileBodySchema = z.object({
  body: updateProfileSchema,
});

// Types
export type ProfileInput = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
