import { SupabaseClient } from '@supabase/supabase-js';

// Type for mock query builder
interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  containedBy: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  csv: jest.Mock;
  match: jest.Mock;
  or: jest.Mock;
}

// Create a chainable mock query builder
export const createMockQueryBuilder = (returnData: unknown = null, error: unknown = null): MockQueryBuilder => {
  const mockBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error }),
    csv: jest.fn().mockResolvedValue({ data: returnData, error }),
    match: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
  };

  // Make chainable methods return the builder
  Object.keys(mockBuilder).forEach((key) => {
    const method = mockBuilder[key as keyof MockQueryBuilder];
    if (!['single', 'maybeSingle', 'csv'].includes(key)) {
      method.mockReturnValue(mockBuilder);
    }
  });

  // The final promise resolution for non-single queries
  mockBuilder.select.mockImplementation(() => {
    const result = { ...mockBuilder } as MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown }>;
    // Add then to make it thenable
    result.then = <TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> => {
      return Promise.resolve({ data: returnData, error }).then(onfulfilled) as Promise<TResult1 | TResult2>;
    };
    return result;
  });

  return mockBuilder;
};

// Create a mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = jest.fn();

  const mockClient = {
    from: mockFrom,
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn(),
        list: jest.fn(),
      }),
    },
    rpc: jest.fn(),
  } as unknown as jest.Mocked<SupabaseClient>;

  return { mockClient, mockFrom };
};

// Helper to set up mock responses for specific tables
export const setupTableMock = (
  mockFrom: jest.Mock,
  tableName: string,
  queryBuilder: MockQueryBuilder
) => {
  mockFrom.mockImplementation((table: string) => {
    if (table === tableName) {
      return queryBuilder;
    }
    return createMockQueryBuilder();
  });
};
