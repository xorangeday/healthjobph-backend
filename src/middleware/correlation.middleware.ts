import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Correlation ID middleware
 * Adds a unique ID to each request for tracing across services
 */
export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  next();
}
