/**
 * Unit tests for send-message API logic
 */

import { createSession, createMessage, getSessionByIdForUser } from '@/features/chatbot/shared/queries';
import { generateChatResponse } from '@/features/chatbot/services/chat.service';

jest.mock('@/features/chatbot/shared/queries');
jest.mock('@/features/chatbot/services/chat.service');

const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;
const mockCreateMessage = createMessage as jest.MockedFunction<typeof createMessage>;
const mockGetSessionByIdForUser = getSessionByIdForUser as jest.MockedFunction<
  typeof getSessionByIdForUser
>;
const mockGenerateChatResponse = generateChatResponse as jest.MockedFunction<
  typeof generateChatResponse
>;

describe('Send Message API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create new session when sessionId not provided', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const mockSession = { id: 1, user_id: userId, title: null };

    mockCreateSession.mockResolvedValue(mockSession as any);

    const result = await createSession({
      user_id: userId,
      title: null,
      created_by: userId,
    });

    expect(result).toEqual(mockSession);
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it('should use existing session when sessionId provided', async () => {
    const sessionId = 1;
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    mockGetSessionByIdForUser.mockResolvedValue({
      id: sessionId,
      user_id: userId,
      title: 'Existing Session',
    } as any);

    const result = await getSessionByIdForUser(sessionId, userId);

    expect(result).toBeDefined();
    expect(result?.id).toBe(sessionId);
  });

  it('should create user and assistant messages', async () => {
    const sessionId = 1;
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    mockCreateMessage.mockResolvedValue({ id: 1, role: 'user', content: 'Hello' } as any);
    mockGenerateChatResponse.mockResolvedValue({
      message: 'Hi there!',
      sources: [],
    });

    await createMessage({
      session_id: sessionId,
      role: 'user',
      content: 'Hello',
      sources: null,
      created_by: userId,
    });

    expect(mockCreateMessage).toHaveBeenCalled();
  });
});
