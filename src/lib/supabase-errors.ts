/**
 * Supabase/PostgREST error code mapping
 * Maps database error codes to user-friendly messages
 */

interface ErrorMapping {
  message: string;
  statusCode: number;
}

const POSTGRES_ERROR_CODES: Record<string, ErrorMapping> = {
  // Unique violation
  '23505': { message: 'A record with this value already exists', statusCode: 409 },
  // Foreign key violation
  '23503': { message: 'Referenced record does not exist', statusCode: 400 },
  // Not null violation
  '23502': { message: 'A required field is missing', statusCode: 400 },
  // Check violation
  '23514': { message: 'Value does not meet requirements', statusCode: 400 },
  // Insufficient privilege
  '42501': { message: 'You do not have permission to perform this action', statusCode: 403 },
  // RLS policy violation
  '42P01': { message: 'Access denied', statusCode: 403 },
};

const POSTGREST_ERROR_CODES: Record<string, ErrorMapping> = {
  // Row not found
  'PGRST116': { message: 'Record not found', statusCode: 404 },
  // Multiple rows returned when single expected
  'PGRST102': { message: 'Multiple records found', statusCode: 409 },
  // JWT error
  'PGRST301': { message: 'Authentication failed', statusCode: 401 },
  // Invalid JWT
  'PGRST302': { message: 'Invalid authentication token', statusCode: 401 },
};

export interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Map Supabase error to user-friendly response
 */
export function mapSupabaseError(error: SupabaseError): ErrorMapping {
  const code = error.code || '';

  // Check Postgres errors first
  if (POSTGRES_ERROR_CODES[code]) {
    return POSTGRES_ERROR_CODES[code];
  }

  // Check PostgREST errors
  if (POSTGREST_ERROR_CODES[code]) {
    return POSTGREST_ERROR_CODES[code];
  }

  // Check for "not found" in message (PGRST116 fallback)
  if (error.message?.includes('rows returned') || error.details?.includes('0 rows')) {
    return { message: 'Record not found', statusCode: 404 };
  }

  // Default error
  return { message: 'An unexpected error occurred', statusCode: 500 };
}

/**
 * Check if error is a "not found" error
 */
export function isNotFoundError(error: SupabaseError): boolean {
  return (
    error.code === 'PGRST116' ||
    (error.message?.includes('rows returned') ?? false) ||
    (error.details?.includes('0 rows') ?? false)
  );
}
