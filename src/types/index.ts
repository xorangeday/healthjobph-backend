/**
 * Express type extensions
 * This file augments the Express Request type with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
        role?: string;
        iat?: number;
        exp?: number;
      };
      accessToken?: string;
      correlationId: string;
    }
  }
}

// This export is required to make this a module
export {};
