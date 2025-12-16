import request from 'supertest';
import { createApp } from '../../app';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import * as supabaseLib from '../../lib/supabase';

// Mock the supabase module
jest.mock('../../lib/supabase');

describe('Profile Routes', () => {
  let app: Express;
  let validToken: string;
  const mockUserId = 'user-123';
  const mockProfileId = 'profile-456';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret';

  const mockProfile = {
    id: mockProfileId,
    user_id: mockUserId,
    first_name: 'John',
    last_name: 'Doe',
    phone: '+639123456789',
    profession: 'Nurse',
    experience: 'mid-level',
    location: 'Manila',
    bio: 'Experienced nurse',
    availability: 'full-time',
    expected_salary: 50000,
    verified: false,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  let mockSupabaseClient: {
    from: jest.Mock;
    rpc: jest.Mock;
  };

  beforeAll(() => {
    app = createApp();

    // Create a valid JWT token
    validToken = jwt.sign(
      {
        sub: mockUserId,
        email: 'test@example.com',
        role: 'authenticated',
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (supabaseLib.createUserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('GET /api/v1/profile', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/v1/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return profile for authenticated user', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
    });

    it('should return 200 with null data when profile not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const response = await request(app)
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /api/v1/profile', () => {
    const validCreateData = {
      first_name: 'John',
      last_name: 'Doe',
      profession: 'Nurse',
      location: 'Manila',
    };

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/profile')
        .send(validCreateData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ first_name: 'J' }); // Missing required fields, too short

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create profile successfully', async () => {
      // Mock no existing profile
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockProfile, error: null });

      const response = await request(app)
        .post('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validCreateData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
    });
  });

  describe('PUT /api/v1/profile', () => {
    const updateData = {
      bio: 'Updated bio',
      availability: 'part-time',
    };

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/v1/profile')
        .send(updateData);

      expect(response.status).toBe(401);
    });

    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, ...updateData };
      let callCount = 0;

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: updatedProfile, error: null }),
        };
      });

      const response = await request(app)
        .put('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).toBe(updateData.bio);
    });
  });

  describe('DELETE /api/v1/profile', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/v1/profile');

      expect(response.status).toBe(401);
    });

    it('should delete profile successfully', async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        return {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      const response = await request(app)
        .delete('/api/v1/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile deleted successfully');
    });
  });
});
