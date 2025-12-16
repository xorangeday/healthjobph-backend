import { CorsOptions } from 'cors';

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean) as string[];

// Vercel preview pattern - restrict to your project name
// Update 'healthjobsph' to match your actual Vercel project name
const vercelPreviewPattern = /^https:\/\/healthjobsph(-[a-z0-9]+)?(-[a-z0-9]+)?\.vercel\.app$/;

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // In development, allow requests without origin (curl, Postman, etc.)
    // In production, require origin header for security
    if (!origin) {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return callback(null, true);
      }
      // Production: reject requests without origin
      console.warn('CORS blocked request with no origin in production');
      return callback(new Error('Origin header required'));
    }

    if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  maxAge: 86400, // 24 hours
};
