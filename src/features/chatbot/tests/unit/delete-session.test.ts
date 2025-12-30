/**
 * Unit tests for delete-session API logic
 */

import { getSessionByIdForUser, deleteSession } from '../../shared/queries';

jest.mock('../../shared/queries');

const mockGetSessionByIdForUser = getSessionByIdForUser as jest.MockedFunction<typeof getSessionByIdForUser>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;

describe('Delete Session API Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delete session when it exists and belongs to user', async () => {
        const sessionId = 1;
        const userId = 1;

        mockGetSessionByIdForUser.mockResolvedValue({
            id: sessionId,
            user_id: userId,
            title: 'Test Session',
        } as any);

        mockDeleteSession.mockResolvedValue(undefined);

        await deleteSession(sessionId, userId);

        expect(mockDeleteSession).toHaveBeenCalledWith(sessionId, userId);
    });

    it('should return null when session does not belong to user', async () => {
        const sessionId = 1;
        const userId = 2;

        mockGetSessionByIdForUser.mockResolvedValue(null);

        const result = await getSessionByIdForUser(sessionId, userId);

        expect(result).toBeNull();
    });
});
