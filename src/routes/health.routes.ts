import { Router, Request, Response } from 'express';
import { createServiceClient } from '../lib/supabase';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
  };
  responseTime: number;
}

/**
 * GET /api/health
 * Full health check with database connectivity
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'error',
    },
    responseTime: 0,
  };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    health.checks.database = error ? 'error' : 'ok';
  } catch (err) {
    console.error('Health check database error:', err);
    health.checks.database = 'error';
  }

  if (health.checks.database === 'error') {
    health.status = 'unhealthy';
  }

  health.responseTime = Date.now() - startTime;

  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});

/**
 * GET /api/health/live
 * Simple liveness probe - is the server running?
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready
 * Readiness probe - is the server ready to accept requests?
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      res.status(503).json({
        status: 'not ready',
        reason: 'database',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Readiness check error:', err);
    res.status(503).json({
      status: 'not ready',
      reason: 'exception',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
