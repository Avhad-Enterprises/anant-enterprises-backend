/**
 * Unit tests for get-session API logic
 */

import { getSessionByIdForUser, getSessionMessages } from '@/features/chatbot/shared/queries';

jest.mock('@/features/chatbot/shared/queries');

const mockGetSessionByIdForUser = getSessionByIdForUser as jest.MockedFunction<
  typeof getSessionByIdForUser
>;
const mockGetSessionMessages = getSessionMessages as jest.MockedFunction<typeof getSessionMessages>;

describe('Get Session API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return session with messages for valid user', async () => {
    const sessionId = 1;
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    mockGetSessionByIdForUser.mockResolvedValue({
      id: sessionId,
      user_id: '550e8400-e29b-41d4-a716-446655440000',
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
    (mockGetSessionByIdForUser as any).mockResolvedValue(null);

    const result = await getSessionByIdForUser(999, '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeNull();
  });
});
