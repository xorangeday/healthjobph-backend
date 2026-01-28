import { ExperienceService } from '../../services/experience.service';
import { NotFoundError, DatabaseError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('ExperienceService', () => {
    const mockAccessToken = 'test-access-token';
    const mockUserId = 'user-123';
    const mockJobSeekerId = 'job-seeker-456';
    const mockExperienceId = 'exp-789';

    const mockExperience = {
        id: mockExperienceId,
        job_seeker_id: mockJobSeekerId,
        position: 'Registered Nurse',
        facility: 'General Hospital',
        start_date: '2020-01-01',
        end_date: '2023-12-31',
        duration: '4 years',
        is_current: false,
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
        it('should return list of experiences', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [mockExperience], error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await ExperienceService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

            expect(result).toEqual([mockExperience]);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('job_seeker_work_history');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('job_seeker_id', mockJobSeekerId);
        });

        it('should return empty array on error', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await ExperienceService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

            expect(result).toEqual([]);
        });
    });

    describe('getForUser', () => {
        it('should get experiences for user', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // getJobSeekerProfileId
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                    };
                }
                // getByJobSeekerId
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    order: jest.fn().mockResolvedValue({ data: [mockExperience], error: null }),
                };
            });

            const result = await ExperienceService.getForUser(mockUserId, mockAccessToken);

            expect(result).toEqual([mockExperience]);
        });

        it('should throw NotFoundError if job seeker profile not found', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            });

            await expect(ExperienceService.getForUser(mockUserId, mockAccessToken))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        const createInput = {
            position: 'Registered Nurse',
            facility: 'General Hospital',
            start_date: '2020-01-01',
            end_date: '2023-12-31',
            duration: '4 years',
            is_current: false,
        };

        it('should create experience successfully', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // getJobSeekerProfileId
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                    };
                }
                if (callCount === 2) {
                    // getByJobSeekerId (check limit)
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        order: jest.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                // insert
                return {
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: mockExperience, error: null }),
                };
            });

            const result = await ExperienceService.create(mockUserId, createInput, mockAccessToken);

            expect(result).toEqual(mockExperience);
        });

        it('should throw error when max entries exceeded', async () => {
            const maxEntries = Array(10).fill(mockExperience);

            let callCount = 0;
            mockSupabaseClient.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    order: jest.fn().mockResolvedValue({ data: maxEntries, error: null }),
                };
            });

            await expect(ExperienceService.create(mockUserId, createInput, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('update', () => {
        const updateInput = { position: 'Senior Nurse' };

        it('should update experience successfully', async () => {
            const updatedExperience = { ...mockExperience, ...updateInput };

            mockSupabaseClient.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: updatedExperience, error: null }),
            });

            const result = await ExperienceService.update(mockExperienceId, updateInput, mockAccessToken);

            expect(result).toEqual(updatedExperience);
        });

        it('should throw DatabaseError on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Error' } }),
            });

            await expect(ExperienceService.update(mockExperienceId, updateInput, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('delete', () => {
        it('should delete experience successfully', async () => {
            mockSupabaseClient.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            await expect(ExperienceService.delete(mockExperienceId, mockAccessToken))
                .resolves.toBeUndefined();
        });

        it('should throw DatabaseError on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: { code: 'P0001', message: 'Error' } }),
            });

            await expect(ExperienceService.delete(mockExperienceId, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });
});
