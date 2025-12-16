import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Zod validation middleware factory
 * Validates request body, query, and params against a Zod schema
 */
export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
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
      next(error);
    }
  };
}

/**
 * Validate only request body
 */
export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid request body',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          correlationId: req.correlationId,
        });
        return;
      }
      next(error);
    }
  };
}
