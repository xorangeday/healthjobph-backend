import { EmployerService } from '../../services/employer.service';
import { NotFoundError, DatabaseError, ConflictError } from '../../lib/errors';
import * as supabaseLib from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
    createUserClient: jest.fn(),
    createServiceClient: jest.fn(),
}));

describe('EmployerService', () => {
    const mockAccessToken = 'test-token';
    const mockUserId = 'user-123';
    const mockEmployerId = 'employer-123';

    const mockEmployer = {
        id: mockEmployerId,
        user_id: mockUserId,
        facility_name: 'General Hospital',
        phone: '1234567890',
        address: '123 Main St',
        city: 'Manila',
        facility_type: 'Hospital',
        contact_person: 'Jane Doe'
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
    });

    describe('getByUserId', () => {
        it('should return employer profile', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockEmployer, error: null })
            });

            const result = await EmployerService.getByUserId(mockUserId, mockAccessToken);
            expect(result).toEqual(mockEmployer);
        });

        it('should return null if not found', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Not found' }
                })
            });

            const result = await EmployerService.getByUserId(mockUserId, mockAccessToken);
            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        const createInput = {
            facility_name: 'General Hospital',
            phone: '1234567890',
            address: '123 Main St',
            city: 'Manila',
            facility_type: 'Hospital',
            contact_person: 'Jane Doe',
            website: null,
            description: null,
            total_employees: null,
            years_in_operation: null
        };

        it('should create employer profile', async () => {
            // Use call count pattern to properly sequence mock responses
            let callCount = 0;
            mockSupabaseClient.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // First call: getByUserId check (returns null - no existing profile)
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
                    };
                }
                // Second call: insert new profile
                return {
                    insert: jest.fn().mockReturnThis(),
                    select: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: mockEmployer, error: null })
                };
            });

            const result = await EmployerService.create(mockUserId, createInput, mockAccessToken);
            expect(result).toEqual(mockEmployer);
        });

        it('should throw ConflictError if already exists', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                // existing found
                single: jest.fn().mockResolvedValue({ data: mockEmployer, error: null })
            });

            await expect(EmployerService.create(mockUserId, createInput, mockAccessToken))
                .rejects.toThrow(ConflictError);
        });
    });

    describe('update', () => {
        it('should update employer profile', async () => {
            mockSupabaseClient.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn()
                    .mockResolvedValueOnce({ data: mockEmployer, error: null }) // check existing
                    .mockResolvedValueOnce({ data: { ...mockEmployer, city: 'Cebu' }, error: null }), // update return
                update: jest.fn().mockReturnThis()
            });

            const result = await EmployerService.update(mockUserId, { city: 'Cebu' }, mockAccessToken);
            expect(result.city).toBe('Cebu');
        });
    });
});
