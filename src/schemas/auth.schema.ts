import { z } from 'zod';
import { createProfileSchema } from './profile.schema';
import { createEmployerSchema } from './employer.schema';

/**
 * Auth validation schemas
 */

// Password validation regex
// At least 8 characters, one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;

// Base registration schema
const baseRegisterSchema = z.object({
    email: z
        .string()
        .email('Please enter a valid email address')
        .transform((val) => val.toLowerCase().trim()),

    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(passwordRegex, 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'),

    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .transform((val) => val.trim()),

    user_type: z.enum(['jobseeker', 'employer'], {
        errorMap: () => ({ message: 'Invalid user type' }),
    }),
});

// Jobseeker registration schema
export const registerJobseekerSchema = baseRegisterSchema.extend({
    user_type: z.literal('jobseeker'),
    // Add profile fields flatly or nested? 
    // Based on current frontend implementation, they might differ.
    // Using partials from profile schema to allow flexibility if needed, 
    // but better to enforce required Structure.
    // We'll accept profile data as a nested 'profile' object or flat fields.
    // Let's go with flat fields for simplicity in JSON payload, 
    // but we need to map them in the controller.
}).merge(createProfileSchema.omit({
    first_name: true,
    last_name: true
}).partial().extend({
    // Override to optional or specific requirements if needed
    profession: z.string().min(1, "Profession is required"),
    experience: z.enum(['entry-level', 'mid-level', 'senior-level', 'expert-level']).optional(),
    location: z.string().min(1, "Location is required"),
}));

// Employer registration schema
export const registerEmployerSchema = baseRegisterSchema.extend({
    user_type: z.literal('employer'),
}).merge(createEmployerSchema.omit({
    contact_person: true // We use 'name' from base schema as contact person
})).extend({
    // Ensure required fields
    facility_name: z.string().min(1, "Facility name is required"),
    facility_type: z.string().min(1, "Facility type is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    phone: z.string().min(1, "Phone is required"),
});


export type RegisterJobseekerInput = z.infer<typeof registerJobseekerSchema>;
export type RegisterEmployerInput = z.infer<typeof registerEmployerSchema>;
