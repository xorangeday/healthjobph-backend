import { JobService } from '../../services/job.service';
import { NotFoundError, ForbiddenError, DatabaseError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

// Mock the supabase module
jest.mock('../../lib/supabase', () => ({
    createUserClient: jest.fn(),
    createServiceClient: jest.fn(),
}));

describe('JobService', () => {
    const mockAccessToken = 'test-access-token';
    const mockEmployerId = 'employer-123';
    const mockJobId = 'job-456';

    const mockJob = {
        id: mockJobId,
        employer_id: mockEmployerId,
        title: 'Registered Nurse',
        location: 'Manila',
        employment_type: 'full-time',
        category: 'Nursing',
        experience: 'mid-level',
        salary_min: 30000,
        salary_max: 40000,
        status: 'active',
        posted_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        requirements: [{ id: 'req-1', requirement: 'BS Nursing' }],
        benefits: [{ id: 'ben-1', benefit: 'Health Insurance' }],
        tags: [{ id: 'tag-1', tag: 'urgent' }]
    };

    let mockSupabaseClient: {
        from: jest.Mock;
        rpc: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabaseClient = {
            from: jest.fn(),
            rpc: jest.fn(),
        };

        (supabaseLib.createUserClient as jest.Mock).mockReturnValue(mockSupabaseClient);
        (supabaseLib.createServiceClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    });

    describe('getPublicJobs', () => {
        it('should return paginated jobs with filters', async () => {
            const mockData = [mockJob];
            const mockCount = 1;

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                ilike: jest.fn().mockReturnThis(),
                or: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({ data: mockData, error: null, count: mockCount })),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await JobService.getPublicJobs({ page: 1, limit: 10, category: 'Nursing' });

            expect(result.data).toEqual(mockData);
            expect(result.pagination.total).toBe(1);
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'Nursing');
        });

        it('should return empty list on error', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockReturnThis(),
                then: jest.fn((resolve) => resolve({
                    data: null,
                    error: { message: 'DB Error' },
                    count: 0
                })),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            await expect(JobService.getPublicJobs({ page: 1, limit: 10 })).rejects.toThrow(DatabaseError);
        });
    });

    describe('getById', () => {
        it('should return job when found', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await JobService.getById(mockJobId);

            expect(result).toEqual(mockJob);
        });

        it('should return null when not found', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' }
                }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await JobService.getById(mockJobId);

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        const createInput = {
            title: 'Registered Nurse',
            department: 'Nursing',
            location: 'Manila',
            employment_type: 'full-time' as const,
            category: 'Nursing',
            experience: 'mid-level' as const,
            facility_type: 'Hospital',
            description: 'Job description',
            salary_display: '30k-40k',
            is_urgent: false,
            rank: 1,
            applicants_count: 0,
            views_count: 0,
            status: 'active' as const,
            requirements: ['Req 1'],
            benefits: ['Ben 1'],
            tags: ['Tag 1']
        };

        it('should create job successfully', async () => {
            // Mock insert job
            const insertJobBuilder = {
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { ...mockJob, id: mockJobId }, error: null })
            };

            // Mock insert related (requirements, benefits, tags)
            const insertRelatedBuilder = {
                insert: jest.fn().mockResolvedValue({ error: null })
            };

            mockSupabaseClient.from.mockImplementation((table) => {
                if (table === 'jobs') return insertJobBuilder;
                return insertRelatedBuilder;
            });

            // Mock getById for final return
            // We need to handle the getById call which creates a NEW client instance
            // Since we are mocking the module function, it should return our mockClient
            // properly. However, getById uses createServiceClient. 

            // Complex mocking needed here because create() calls getById() internally
            // which calls createServiceClient().
            // We already mocked both factory functions to return mockSupabaseClient.

            // We need to differentiate behaviors based on call sequence or args? 
            // Or simplified: just make 'jobs' select return value.

            // Let's refine the mock implementation for 'from'
            mockSupabaseClient.from.mockImplementation((table) => {
                if (table === 'jobs') {
                    // It's either the insert or the select from getById
                    // We can distinguish by methods called, but jest.fn() returns object.
                    // Let's try to simulate a sequence if needed, or just return an object that handles both.
                    return {
                        insert: jest.fn().mockReturnThis(),
                        select: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
                        eq: jest.fn().mockReturnThis(), // for getById
                        delete: jest.fn() // unused here
                    }
                }
                return {
                    insert: jest.fn().mockResolvedValue({ error: null }),
                    delete: jest.fn().mockResolvedValue({ error: null })
                }
            });


            const result = await JobService.create(mockEmployerId, createInput, mockAccessToken);

            expect(result).toEqual(mockJob);
        });
    });

    describe('update', () => {
        it('should update job successfully', async () => {
            const updateInput = { title: 'Updated Title' };

            // Mock ownership check (getById)
            // Mock update
            // Mock getById (final return)

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn()
                    .mockResolvedValueOnce({ data: { ...mockJob, employer_id: mockEmployerId }, error: null }) // ownership check
                    .mockResolvedValueOnce({ data: { ...mockJob, title: 'Updated Title' }, error: null }) // update return
                    .mockResolvedValueOnce({ data: { ...mockJob, title: 'Updated Title' }, error: null }), // final fetch
                update: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(), // Needed for requirements cleanup mocks if chained on same builder? No cleanup uses different from() calls usually if table differs.
                insert: jest.fn().mockReturnThis()
            };

            mockSupabaseClient.from.mockImplementation((table) => {
                if (table === 'jobs') {
                    return mockQueryBuilder;
                }
                // requirements cleanup
                return {
                    delete: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockResolvedValue({ error: null }),
                    insert: jest.fn().mockResolvedValue({ error: null })
                }
            });

            const result = await JobService.update(mockJobId, mockEmployerId, updateInput, mockAccessToken);

            expect(result.title).toBe('Updated Title');
        });

        it('should throw ForbiddenError if not owner', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { ...mockJob, employer_id: 'other-employer' }, error: null })
            });

            await expect(
                JobService.update(mockJobId, mockEmployerId, {}, mockAccessToken)
            ).rejects.toThrow(ForbiddenError);
        });
    });

    describe('delete', () => {
        it('should delete job successfully', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(), // shared by select and delete
                single: jest.fn().mockResolvedValue({ data: { ...mockJob, employer_id: mockEmployerId }, error: null }),
                delete: jest.fn().mockReturnThis()
            });

            await JobService.delete(mockJobId, mockEmployerId, mockAccessToken);
        });
    });

});
