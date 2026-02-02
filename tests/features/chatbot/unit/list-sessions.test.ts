/**
 * Unit tests for list-sessions API logic
 */

import { listUserSessions } from '@/features/chatbot/shared/queries';

jest.mock('@/features/chatbot/shared/queries');

const mockListUserSessions = listUserSessions as jest.MockedFunction<typeof listUserSessions>;

describe('List Sessions API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user sessions with pagination', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const mockSessions = [
      { id: 1, user_id: userId, title: 'Session 1' },
      { id: 2, user_id: userId, title: 'Session 2' },
    ];

    mockListUserSessions.mockResolvedValue(mockSessions as any);

    const result = await listUserSessions(userId, 1, 10);

    expect(result).toEqual(mockSessions);
    expect(mockListUserSessions).toHaveBeenCalledWith(userId, 1, 10);
  });

  it('should filter sessions by user ID', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    mockListUserSessions.mockResolvedValue([] as any);

    await listUserSessions(userId, 1, 10);

    expect(mockListUserSessions).toHaveBeenCalledWith(userId, 1, 10);
  });
});
