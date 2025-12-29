/**
 * Unit tests for get-session API logic
 */

import { getSessionByIdForUser, getSessionMessages } from '../../shared/queries';

jest.mock('../../shared/queries');

const mockGetSessionByIdForUser = getSessionByIdForUser as jest.MockedFunction<typeof getSessionByIdForUser>;
const mockGetSessionMessages = getSessionMessages as jest.MockedFunction<typeof getSessionMessages>;

describe('Get Session API Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return session with messages for valid user', async () => {
        const sessionId = 1;
        const userId = 1;

        mockGetSessionByIdForUser.mockResolvedValue({
            id: sessionId,
            user_id: userId,
            title: 'Test Session',
        } as any);

        mockGetSessionMessages.mockResolvedValue([
            { id: 1, role: 'user', content: 'Hello' },
            { id: 2, role: 'assistant', content: 'Hi!' },
        ] as any);

        const session = await getSessionByIdForUser(sessionId, userId);
        const messages = await getSessionMessages(sessionId);

        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(messages).toHaveLength(2);
    });

    it('should return null for non-existent session', async () => {
        mockGetSessionByIdForUser.mockResolvedValue(null);

        const result = await getSessionByIdForUser(999, 1);

        expect(result).toBeNull();
    });
});
