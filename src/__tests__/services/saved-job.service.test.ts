import { SavedJobService } from '../../services/saved-job.service';
import { NotFoundError, DatabaseError, ConflictError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('SavedJobService', () => {
    const mockAccessToken = 'test-access-token';
    const mockUserId = 'user-123';
    const mockJobSeekerId = 'job-seeker-456';
    const mockJobId = 'job-789';

    const mockSavedJob = {
        id: 'saved-job-001',
        job_seeker_id: mockJobSeekerId,
        job_id: mockJobId,
        saved_date: '2024-01-15T10:00:00Z',
    };

    const mockSavedJobWithDetails = {
        ...mockSavedJob,
        job: {
            id: mockJobId,
            title: 'Registered Nurse',
            location: 'Manila',
            employment_type: 'full-time',
            category: 'Nursing',
            salary_display: 'PHP 40,000 - 50,000',
            posted_date: '2024-01-01',
            description: 'Looking for RN',
            facility_type: 'Hospital',
            experience: 'mid-level',
            employers: { facility_name: 'General Hospital' },
        },
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

    describe('getForUser', () => {
        it('should return list of saved jobs', async () => {
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
                // getForUser
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    order: jest.fn().mockResolvedValue({ data: [mockSavedJob], error: null }),
                };
            });

            const result = await SavedJobService.getForUser(mockUserId, mockAccessToken);

            expect(result).toEqual([mockSavedJob]);
        });

        it('should return empty array on error', async () => {
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
                    order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
                };
            });

            const result = await SavedJobService.getForUser(mockUserId, mockAccessToken);

            expect(result).toEqual([]);
        });

        it('should throw NotFoundError if job seeker profile not found', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            });

            await expect(SavedJobService.getForUser(mockUserId, mockAccessToken))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('getWithDetails', () => {
        it('should return saved jobs with job details', async () => {
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
                    order: jest.fn().mockResolvedValue({ data: [mockSavedJobWithDetails], error: null }),
                };
            });

            const result = await SavedJobService.getWithDetails(mockUserId, mockAccessToken);

            expect(result).toEqual([mockSavedJobWithDetails]);
            expect(result[0].job?.title).toBe('Registered Nurse');
        });
    });

    describe('save', () => {
        it('should save a job successfully', async () => {
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
                    // check if already saved
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnThis(),
                            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                        }),
                    };
                }
                // insert
                return {
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: mockSavedJob, error: null }),
                };
            });

            const result = await SavedJobService.save(mockUserId, mockJobId, mockAccessToken);

            expect(result).toEqual(mockSavedJob);
        });

        it('should throw ConflictError if job is already saved', async () => {
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
                // already saved
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
                    }),
                };
            });

            await expect(SavedJobService.save(mockUserId, mockJobId, mockAccessToken))
                .rejects.toThrow(ConflictError);
        });
    });

    describe('unsave', () => {
        it('should unsave a job successfully', async () => {
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
                    delete: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: null }),
                    }),
                };
            });

            await expect(SavedJobService.unsave(mockUserId, mockJobId, mockAccessToken))
                .resolves.toBeUndefined();
        });

        it('should throw DatabaseError on error', async () => {
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
                    delete: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: { code: 'P0001', message: 'Error' } }),
                    }),
                };
            });

            await expect(SavedJobService.unsave(mockUserId, mockJobId, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('isSaved', () => {
        it('should return true if job is saved', async () => {
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
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: 'saved-id' }, error: null }),
                    }),
                };
            });

            const result = await SavedJobService.isSaved(mockUserId, mockJobId, mockAccessToken);

            expect(result).toBe(true);
        });

        it('should return false if job is not saved', async () => {
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
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                    }),
                };
            });

            const result = await SavedJobService.isSaved(mockUserId, mockJobId, mockAccessToken);

            expect(result).toBe(false);
        });
    });

    describe('getCount', () => {
        it('should return count of saved jobs', async () => {
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
                    eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
                };
            });

            const result = await SavedJobService.getCount(mockUserId, mockAccessToken);

            expect(result).toBe(5);
        });

        it('should return 0 on error', async () => {
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
                    eq: jest.fn().mockResolvedValue({ count: null, error: { message: 'Error' } }),
                };
            });

            const result = await SavedJobService.getCount(mockUserId, mockAccessToken);

            expect(result).toBe(0);
        });
    });
});
