import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.general,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter
 * 10 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.auth,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Mutation endpoints rate limiter
 * 30 requests per minute per IP
 */
export const mutationRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.mutations,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many write operations, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
