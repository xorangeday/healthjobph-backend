import { ProfileService } from '../../services/profile.service';
import { NotFoundError, ConflictError, DatabaseError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

// Mock the supabase module
jest.mock('../../lib/supabase');

describe('ProfileService', () => {
  const mockAccessToken = 'test-access-token';
  const mockUserId = 'user-123';
  const mockProfileId = 'profile-456';

  const mockProfile = {
    id: mockProfileId,
    user_id: mockUserId,
    first_name: 'John',
    last_name: 'Doe',
    phone: '+639123456789',
    profession: 'Nurse',
    experience: 'mid-level' as const,
    location: 'Manila',
    bio: 'Experienced nurse',
    availability: 'full-time' as const,
    expected_salary: 50000,
    verified: false,
    status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  let mockSupabaseClient: {
    from: jest.Mock;
    rpc: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh mock client for each test
    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (supabaseLib.createUserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getByUserId', () => {
    it('should return profile when found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await ProfileService.getByUserId(mockUserId, mockAccessToken);

      expect(result).toEqual(mockProfile);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('job_seekers');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should return null when profile not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await ProfileService.getByUserId(mockUserId, mockAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'Table not found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await ProfileService.getByUserId(mockUserId, mockAccessToken);

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return profile when found by ID', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await ProfileService.getById(mockProfileId, mockAccessToken);

      expect(result).toEqual(mockProfile);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', mockProfileId);
    });

    it('should return null when not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await ProfileService.getById('non-existent-id', mockAccessToken);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createInput = {
      first_name: 'John',
      last_name: 'Doe',
      profession: 'Nurse',
      location: 'Manila',
      experience: 'mid-level' as const,
      phone: '+639123456789',
    };

    it('should create a new profile successfully', async () => {
      // Mock getByUserId to return null (no existing profile)
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);

      // Mock rpc call for profile creation
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockProfile, error: null });

      const result = await ProfileService.create(mockUserId, createInput, mockAccessToken);

      expect(result).toEqual(mockProfile);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_job_seeker_profile', {
        p_user_id: mockUserId,
        p_first_name_text: createInput.first_name,
        p_last_name_text: createInput.last_name,
        p_profession_text: createInput.profession,
        p_experience_level: createInput.experience,
        p_location_text: createInput.location,
        p_phone_number: createInput.phone,
      });
    });

    it('should throw ConflictError if profile already exists', async () => {
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);

      await expect(
        ProfileService.create(mockUserId, createInput, mockAccessToken)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw DatabaseError on rpc failure', async () => {
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'Database error' },
      });

      await expect(
        ProfileService.create(mockUserId, createInput, mockAccessToken)
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    const updateInput = {
      bio: 'Updated bio',
      availability: 'part-time' as const,
    };

    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockProfile, ...updateInput };

      // First call returns existing profile, second call is for update
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

      const result = await ProfileService.update(mockUserId, updateInput, mockAccessToken);

      expect(result).toEqual(updatedProfile);
    });

    it('should throw NotFoundError if profile does not exist', async () => {
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);

      await expect(
        ProfileService.update(mockUserId, updateInput, mockAccessToken)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
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

      await expect(
        ProfileService.delete(mockUserId, mockAccessToken)
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError if profile does not exist', async () => {
      const selectMockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(selectMockBuilder);

      await expect(
        ProfileService.delete(mockUserId, mockAccessToken)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
