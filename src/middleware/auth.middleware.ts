import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface SupabaseJWTPayload {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  role?: string;
  iat: number;
  exp: number;
  aud?: string;
}

/**
 * Validates Supabase JWT and attaches user info to request.
 * The JWT is verified using Supabase's JWT secret.
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No authorization header provided',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Expected: Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET is not configured');
      res.status(500).json({
        success: false,
        error: 'Server Configuration Error',
        message: 'Authentication is not properly configured',
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as SupabaseJWTPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      user_metadata: decoded.user_metadata,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // Store original token for forwarding to Supabase (maintains RLS context)
    req.accessToken = token;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    console.error('JWT verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided.
 * Useful for endpoints that can work both authenticated and anonymously.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  authenticateJWT(req, res, next);
}

/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticateJWT.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userType = req.user.user_metadata?.user_type as string | undefined;

    if (!userType || !allowedRoles.includes(userType)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
