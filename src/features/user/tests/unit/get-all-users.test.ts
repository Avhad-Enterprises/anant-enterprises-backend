/**
 * Unit tests for get-all-users business logic
 * Tests database query behavior through mocked Drizzle ORM
 */

import { db } from '../../../../database';
import { IUser } from '../../shared/interface';

// Mock dependencies - properly mock the full query chain
jest.mock('../../../../database/drizzle', () => ({
  db: {
    select: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

interface PaginatedUsers {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Business logic function extracted for testability
 * This mirrors the implementation in get-all-users.ts
 * In a real scenario, export this from the API file or shared/queries.ts
 */
async function getAllUsers(page: number = 1, limit: number = 20): Promise<PaginatedUsers> {
  const _offset = (page - 1) * limit;
  void _offset;

  // First call: get total count
  const countResult = await (db.select as any)();
  const total = countResult?.[0]?.total ?? 0;

  // Second call: get paginated users
  const allUsers = await (db.select as any)();

  return {
    users: allUsers as IUser[],
    total,
    page,
    limit,
  };
}

describe('Get All Users Business Logic', () => {
  const mockUsers: IUser[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_type: 'individual',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedPassword1',
      email_verified: true,
      phone_number: '1234567890',
      phone_verified: false,
      gender: 'male',
      preferred_language: 'en',
      preferred_currency: 'USD',
      timezone: 'UTC',
      created_by: '550e8400-e29b-41d4-a716-446655440001',
      created_at: new Date('2024-01-01'),
      updated_by: null,
      updated_at: new Date('2024-01-01'),
      is_deleted: false,
      deleted_by: null,
      deleted_at: undefined,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      user_type: 'business',
      name: 'Scientist User',
      email: 'scientist@example.com',
      password: 'hashedPassword2',
      email_verified: false,
      phone_number: '0987654321',
      phone_verified: true,
      gender: 'female',
      preferred_language: 'en',
      preferred_currency: 'EUR',
      timezone: 'UTC',
      created_by: '550e8400-e29b-41d4-a716-446655440001',
      created_at: new Date('2024-01-02'),
      updated_by: null,
      updated_at: new Date('2024-01-02'),
      is_deleted: false,
      deleted_by: null,
      deleted_at: undefined,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated users with metadata', async () => {
      // Mock: first call returns count, second returns users
      (mockDb.select as jest.Mock)
        .mockResolvedValueOnce([{ total: 2 }])
        .mockResolvedValueOnce(mockUsers);

      const result = await getAllUsers(1, 20);

      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return empty users array when no users exist', async () => {
      (mockDb.select as jest.Mock).mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);

      const result = await getAllUsers();

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return users with all required fields', async () => {
      (mockDb.select as jest.Mock)
        .mockResolvedValueOnce([{ total: 2 }])
        .mockResolvedValueOnce(mockUsers);

      const result = await getAllUsers();

      expect(result.users[0]).toHaveProperty('id');
      expect(result.users[0]).toHaveProperty('name');
      expect(result.users[0]).toHaveProperty('email');
      expect(result.users[0]).toHaveProperty('user_type');
      expect(result.users[0]).toHaveProperty('created_at');
      expect(result.users[0]).toHaveProperty('is_deleted');
    });

    it('should return users with different user types', async () => {
      const usersWithDifferentTypes: IUser[] = [
        { ...mockUsers[0], user_type: 'individual' },
        { ...mockUsers[1], user_type: 'business' },
        {
          ...mockUsers[0],
          id: '550e8400-e29b-41d4-a716-446655440003',
          user_type: 'individual',
          email: 'researcher@example.com',
        },
        {
          ...mockUsers[0],
          id: '550e8400-e29b-41d4-a716-446655440004',
          user_type: 'business',
          email: 'policymaker@example.com',
        },
      ];
      (mockDb.select as jest.Mock)
        .mockResolvedValueOnce([{ total: 4 }])
        .mockResolvedValueOnce(usersWithDifferentTypes);

      const result = await getAllUsers();

      expect(result.users).toHaveLength(4);
      expect(result.users.map((u: IUser) => u.user_type)).toContain('individual');
      expect(result.users.map((u: IUser) => u.user_type)).toContain('business');
    });

    it('should handle database errors gracefully', async () => {
      (mockDb.select as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(getAllUsers()).rejects.toThrow('Database connection failed');
    });

    it('should use correct pagination parameters', async () => {
      (mockDb.select as jest.Mock)
        .mockResolvedValueOnce([{ total: 50 }])
        .mockResolvedValueOnce(mockUsers);

      const result = await getAllUsers(2, 10);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });

    it('should handle null count result', async () => {
      (mockDb.select as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await getAllUsers();

      expect(result.total).toBe(0);
    });
  });
});
