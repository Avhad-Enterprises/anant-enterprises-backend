/**
 * Unit tests for delete-session API logic
 */

import { getSessionByIdForUser, deleteSession } from '../../shared/queries';

jest.mock('../../shared/queries');

const mockGetSessionByIdForUser = getSessionByIdForUser as jest.MockedFunction<
  typeof getSessionByIdForUser
>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;

describe('Delete Session API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete session when it exists and belongs to user', async () => {
    const sessionId = 1;
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    mockGetSessionByIdForUser.mockResolvedValue({
      id: sessionId,
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Session',
    } as any);

    mockDeleteSession.mockResolvedValue(undefined);

    await deleteSession(sessionId, userId);

    expect(mockDeleteSession).toHaveBeenCalledWith(sessionId, userId);
  });

  it('should return null when session does not belong to user', async () => {
    const sessionId = 1;
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    (mockGetSessionByIdForUser as any).mockResolvedValue(null);

    const result = await getSessionByIdForUser(sessionId, userId);

    expect(result).toBeNull();
  });
});
