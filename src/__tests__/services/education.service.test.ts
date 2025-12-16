import { EducationService } from '../../services/education.service';
import { NotFoundError, DatabaseError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

// Mock the supabase module
jest.mock('../../lib/supabase');

describe('EducationService', () => {
  const mockAccessToken = 'test-access-token';
  const mockUserId = 'user-123';
  const mockJobSeekerId = 'job-seeker-456';
  const mockEducationId = 'education-789';

  const mockEducation = {
    id: mockEducationId,
    job_seeker_id: mockJobSeekerId,
    degree: 'Bachelor of Science in Nursing',
    school: 'University of the Philippines',
    year: '2020',
    honors: 'Magna Cum Laude',
    created_at: '2024-01-01T00:00:00Z',
  };

  let mockSupabaseClient: {
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      from: jest.fn(),
    };

    (supabaseLib.createUserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('getByJobSeekerId', () => {
    it('should return education entries', async () => {
      const mockEducations = [mockEducation];
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockEducations, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await EducationService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

      expect(result).toEqual(mockEducations);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('job_seeker_education');
    });

    it('should return empty array on error', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await EducationService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

      expect(result).toEqual([]);
    });
  });

  describe('getForUser', () => {
    it('should get education for user', async () => {
      const mockEducations = [mockEducation];
      let callCount = 0;

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: get job seeker profile
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockJobSeekerId },
              error: null,
            }),
          };
        }
        // Second call: get education
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockEducations, error: null }),
        };
      });

      const result = await EducationService.getForUser(mockUserId, mockAccessToken);

      expect(result).toEqual(mockEducations);
    });

    it('should throw NotFoundError if job seeker profile not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await expect(
        EducationService.getForUser(mockUserId, mockAccessToken)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    const createInput = {
      degree: 'Bachelor of Science in Nursing',
      school: 'University of the Philippines',
      year: '2020',
      honors: 'Magna Cum Laude',
    };

    it('should create education successfully', async () => {
      let callCount = 0;

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Get job seeker profile
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockJobSeekerId },
              error: null,
            }),
          };
        }
        if (callCount === 2) {
          // Get existing education (for limit check)
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        // Insert new education
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEducation, error: null }),
        };
      });

      const result = await EducationService.create(mockUserId, createInput, mockAccessToken);

      expect(result).toEqual(mockEducation);
    });

    it('should throw DatabaseError when limit exceeded', async () => {
      const existingEducations = Array(10).fill(mockEducation);
      let callCount = 0;

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockJobSeekerId },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: existingEducations, error: null }),
        };
      });

      await expect(
        EducationService.create(mockUserId, createInput, mockAccessToken)
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    const updateInput = {
      honors: 'Summa Cum Laude',
    };

    it('should update education successfully', async () => {
      const updatedEducation = { ...mockEducation, ...updateInput };
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedEducation, error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await EducationService.update(mockEducationId, updateInput, mockAccessToken);

      expect(result).toEqual(updatedEducation);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('job_seeker_education');
    });

    it('should throw DatabaseError on update failure', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'P0001', message: 'Update failed' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await expect(
        EducationService.update(mockEducationId, updateInput, mockAccessToken)
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete education successfully', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await expect(
        EducationService.delete(mockEducationId, mockAccessToken)
      ).resolves.toBeUndefined();
    });

    it('should throw DatabaseError on delete failure', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { code: 'P0001', message: 'Delete failed' },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await expect(
        EducationService.delete(mockEducationId, mockAccessToken)
      ).rejects.toThrow(DatabaseError);
    });
  });
});
