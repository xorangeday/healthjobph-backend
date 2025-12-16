import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { ZodError } from 'zod';

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log error with correlation ID for tracing
  console.error('Error:', {
    correlationId: req.correlationId,
    name: error.name,
    message: error.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      correlationId: req.correlationId,
    });
    return;
  }

  // Handle custom AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.name,
      message: error.message,
      code: error.code,
      correlationId: req.correlationId,
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred',
    correlationId: req.correlationId,
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId,
  });
}
