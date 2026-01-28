import { DashboardService } from '../../services/dashboard.service';
import { NotFoundError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('DashboardService', () => {
    const mockAccessToken = 'test-access-token';
    const mockUserId = 'user-123';
    const mockJobSeekerId = 'job-seeker-456';
    const mockEmployerId = 'employer-789';

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

    describe('getJobSeekerStats', () => {
        const mockApplications = [
            { status: 'applied' },
            { status: 'applied' },
            { status: 'under-review' },
            { status: 'interview-scheduled' },
            { status: 'offered' },
            { status: 'rejected' },
        ];

        it('should return job seeker dashboard stats', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation((table: string) => {
                callCount++;
                if (callCount === 1 && table === 'job_seekers') {
                    // getJobSeekerProfileId
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                    };
                }
                if (table === 'applications') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: mockApplications, error: null }),
                    };
                }
                if (table === 'profile_views') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ count: 10, error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                };
            });

            const result = await DashboardService.getJobSeekerStats(mockUserId, mockAccessToken);

            expect(result.totalApplications).toBe(6);
            expect(result.profileViews).toBe(10);
            expect(result.interviewsScheduled).toBe(1);
            expect(result.jobOffers).toBe(1);
            expect(result.applicationsByStatus.applied).toBe(2);
            expect(result.applicationsByStatus.underReview).toBe(1);
            expect(result.applicationsByStatus.interviewScheduled).toBe(1);
            expect(result.applicationsByStatus.offered).toBe(1);
            expect(result.applicationsByStatus.rejected).toBe(1);
        });

        it('should return default stats when no applications found', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation((table: string) => {
                callCount++;
                if (callCount === 1 && table === 'job_seekers') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                    };
                }
                if (table === 'applications') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                    };
                }
                if (table === 'profile_views') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: { id: mockJobSeekerId }, error: null }),
                };
            });

            const result = await DashboardService.getJobSeekerStats(mockUserId, mockAccessToken);

            expect(result.totalApplications).toBe(0);
            expect(result.profileViews).toBe(5);
        });

        it('should return default stats on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            });

            const result = await DashboardService.getJobSeekerStats(mockUserId, mockAccessToken);

            expect(result.totalApplications).toBe(0);
            expect(result.profileViews).toBe(0);
        });
    });

    describe('getEmployerStats', () => {
        const mockJobs = [
            { id: 'job-1', status: 'active', views_count: 100 },
            { id: 'job-2', status: 'active', views_count: 50 },
            { id: 'job-3', status: 'closed', views_count: 75 },
        ];

        const mockApplications = [
            { status: 'applied' },
            { status: 'applied' },
            { status: 'under-review' },
            { status: 'interview-scheduled' },
            { status: 'offered' },
        ];

        it('should return employer dashboard stats', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation((table: string) => {
                callCount++;
                if (callCount === 1 && table === 'employers') {
                    // getEmployerProfileId
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockEmployerId }, error: null }),
                    };
                }
                if (table === 'jobs') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
                    };
                }
                if (table === 'applications') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        in: jest.fn().mockResolvedValue({ data: mockApplications, error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: { id: mockEmployerId }, error: null }),
                };
            });

            const result = await DashboardService.getEmployerStats(mockUserId, mockAccessToken);

            expect(result.totalJobs).toBe(3);
            expect(result.activeJobs).toBe(2);
            expect(result.totalViews).toBe(225);
            expect(result.totalApplications).toBe(5);
            expect(result.applicationsByStatus.applied).toBe(2);
            expect(result.applicationsByStatus.underReview).toBe(1);
            expect(result.applicationsByStatus.interviewScheduled).toBe(1);
            expect(result.applicationsByStatus.offered).toBe(1);
        });

        it('should return default stats when no jobs found', async () => {
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation((table: string) => {
                callCount++;
                if (callCount === 1 && table === 'employers') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: { id: mockEmployerId }, error: null }),
                    };
                }
                if (table === 'jobs') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: { id: mockEmployerId }, error: null }),
                };
            });

            const result = await DashboardService.getEmployerStats(mockUserId, mockAccessToken);

            expect(result.totalJobs).toBe(0);
            expect(result.activeJobs).toBe(0);
            expect(result.totalViews).toBe(0);
        });

        it('should return default stats on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            });

            const result = await DashboardService.getEmployerStats(mockUserId, mockAccessToken);

            expect(result.totalJobs).toBe(0);
            expect(result.activeJobs).toBe(0);
        });
    });
});
