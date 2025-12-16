import { z } from 'zod';

/**
 * Employer profile validation schemas
 */

// Facility types
export const facilityTypes = [
  'Private Hospital',
  'Public Hospital',
  'Government Hospital',
  'Medical Center',
  'Specialty Clinic',
  'Diagnostic Center',
  'Rehabilitation Center',
  'Nursing Home',
  'Birthing Center',
  'Ambulatory Surgery Center',
  'Home Healthcare Agency',
  'Pharmacy',
  'Medical Laboratory',
  'Other',
] as const;

// Phone regex for Philippine numbers
const phoneRegex = /^(\+63|0)?[0-9]{10,11}$/;

// URL regex
const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

// Create employer profile schema
export const createEmployerSchema = z.object({
  facility_name: z
    .string()
    .min(2, 'Facility name must be at least 2 characters')
    .max(200, 'Facility name must not exceed 200 characters')
    .transform((val) => val.trim()),

  phone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid Philippine phone number')
    .transform((val) => val.trim()),

  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must not exceed 500 characters')
    .transform((val) => val.trim()),

  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City must not exceed 100 characters')
    .transform((val) => val.trim()),

  website: z
    .string()
    .regex(urlRegex, 'Please enter a valid website URL')
    .max(200, 'Website must not exceed 200 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  facility_type: z
    .string()
    .min(2, 'Facility type is required')
    .max(100, 'Facility type must not exceed 100 characters')
    .transform((val) => val.trim()),

  contact_person: z
    .string()
    .min(2, 'Contact person is required')
    .max(200, 'Contact person must not exceed 200 characters')
    .transform((val) => val.trim()),

  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  total_employees: z
    .string()
    .max(50, 'Total employees must not exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),

  years_in_operation: z
    .string()
    .max(50, 'Years in operation must not exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

// Update employer profile schema (all fields optional)
export const updateEmployerSchema = createEmployerSchema.partial();

// Types
export type CreateEmployerInput = z.infer<typeof createEmployerSchema>;
export type UpdateEmployerInput = z.infer<typeof updateEmployerSchema>;
