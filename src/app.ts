import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './types'; // Load Express type augmentations
import { corsConfig } from './config/cors';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { correlationId } from './middleware/correlation.middleware';
import { generalRateLimiter } from './middleware/rate-limit.middleware';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  // Correlation ID first (for tracing)
  app.use(correlationId);

  // Security middleware
  app.use(helmet());
  app.use(cors(corsConfig));

  // Rate limiting
  app.use(generalRateLimiter);

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
