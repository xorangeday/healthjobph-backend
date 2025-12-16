import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';

describe('Health Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/health/live', () => {
    it('should return 200 with alive status', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should have correlation ID in response headers', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('GET /api/health (with DB check)', () => {
    it('should return health status with database check info', async () => {
      const response = await request(app).get('/api/health');

      // In test environment without real DB, this returns 503
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('GET /api/health/ready (with DB check)', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/api/health/ready');

      // In test environment without real DB, this returns 503
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
