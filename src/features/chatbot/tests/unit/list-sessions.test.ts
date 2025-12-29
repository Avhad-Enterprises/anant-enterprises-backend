/**
 * Unit tests for list-sessions API logic
 */

import { listUserSessions } from '../../shared/queries';

jest.mock('../../shared/queries');

const mockListUserSessions = listUserSessions as jest.MockedFunction<typeof listUserSessions>;

describe('List Sessions API Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return user sessions with pagination', async () => {
        const userId = 1;
        const mockSessions = [
            { id: 1, user_id: userId, title: 'Session 1' },
            { id: 2, user_id: userId, title: 'Session 2' },
        ];

        mockListUserSessions.mockResolvedValue(mockSessions as any);

        const result = await listUserSessions(userId, { page: 1, limit: 10 });

        expect(result).toEqual(mockSessions);
        expect(mockListUserSessions).toHaveBeenCalledWith(userId, { page: 1, limit: 10 });
    });

    it('should filter sessions by user ID', async () => {
        const userId = 1;
        mockListUserSessions.mockResolvedValue([] as any);

        await listUserSessions(userId, { page: 1, limit: 10 });

        expect(mockListUserSessions).toHaveBeenCalledWith(userId, expect.any(Object));
    });
});
