import { CertificationService } from '../../services/certification.service';
import { NotFoundError, DatabaseError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

jest.mock('../../lib/supabase');

describe('CertificationService', () => {
    const mockAccessToken = 'test-access-token';
    const mockUserId = 'user-123';
    const mockJobSeekerId = 'job-seeker-456';
    const mockCertificationId = 'cert-789';

    const mockCertification = {
        id: mockCertificationId,
        job_seeker_id: mockJobSeekerId,
        certification: 'Registered Nurse License',
        issuing_organization: 'PRC',
        issue_date: '2020-01-15',
        expiry_date: '2025-01-15',
        credential_id: 'RN-123456',
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
        it('should return list of certifications', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [mockCertification], error: null }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await CertificationService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

            expect(result).toEqual([mockCertification]);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('job_seeker_certifications');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('job_seeker_id', mockJobSeekerId);
        });

        it('should return empty array on error', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
            };
            mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

            const result = await CertificationService.getByJobSeekerId(mockJobSeekerId, mockAccessToken);

            expect(result).toEqual([]);
        });
    });

    describe('getForUser', () => {
        it('should get certifications for user', async () => {
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
                    order: jest.fn().mockResolvedValue({ data: [mockCertification], error: null }),
                };
            });

            const result = await CertificationService.getForUser(mockUserId, mockAccessToken);

            expect(result).toEqual([mockCertification]);
        });

        it('should throw NotFoundError if job seeker profile not found', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            });

            await expect(CertificationService.getForUser(mockUserId, mockAccessToken))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('create', () => {
        const createInput = {
            certification: 'Registered Nurse License',
            issuing_organization: 'PRC',
            issue_date: '2020-01-15',
            expiry_date: '2025-01-15',
            credential_id: 'RN-123456',
        };

        it('should create certification successfully', async () => {
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
                    single: jest.fn().mockResolvedValue({ data: mockCertification, error: null }),
                };
            });

            const result = await CertificationService.create(mockUserId, createInput, mockAccessToken);

            expect(result).toEqual(mockCertification);
        });

        it('should throw error when max entries exceeded', async () => {
            const maxEntries = Array(20).fill(mockCertification);

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

            await expect(CertificationService.create(mockUserId, createInput, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('update', () => {
        const updateInput = { expiry_date: '2026-01-15' };

        it('should update certification successfully', async () => {
            const updatedCertification = { ...mockCertification, ...updateInput };

            mockSupabaseClient.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: updatedCertification, error: null }),
            });

            const result = await CertificationService.update(mockCertificationId, updateInput, mockAccessToken);

            expect(result).toEqual(updatedCertification);
        });

        it('should throw DatabaseError on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Error' } }),
            });

            await expect(CertificationService.update(mockCertificationId, updateInput, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('delete', () => {
        it('should delete certification successfully', async () => {
            mockSupabaseClient.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            await expect(CertificationService.delete(mockCertificationId, mockAccessToken))
                .resolves.toBeUndefined();
        });

        it('should throw DatabaseError on error', async () => {
            mockSupabaseClient.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ error: { code: 'P0001', message: 'Error' } }),
            });

            await expect(CertificationService.delete(mockCertificationId, mockAccessToken))
                .rejects.toThrow(DatabaseError);
        });
    });
});
