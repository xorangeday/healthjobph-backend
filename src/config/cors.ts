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
    // Requests without origin are either:
    // - Same-origin requests (browser, safe)
    // - Non-browser requests (curl, Postman, health checks, server-to-server)
    // These are safe to allow - CORS only protects against cross-origin browser requests
    if (!origin) {
      return callback(null, true);
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
