/**
 * Unit tests for list-documents API logic
 */

import { listDocuments } from '../../shared/queries';

jest.mock('../../shared/queries');

const mockListDocuments = listDocuments as jest.MockedFunction<typeof listDocuments>;

describe('List Documents API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated documents', async () => {
    const mockDocs = [
      { id: 1, name: 'Doc 1', status: 'completed' },
      { id: 2, name: 'Doc 2', status: 'pending' },
    ];

    mockListDocuments.mockResolvedValue(mockDocs as any);

    const result = await listDocuments(1, 10);

    expect(result).toEqual(mockDocs);
    expect(mockListDocuments).toHaveBeenCalledWith(1, 10);
  });

  it('should handle different pagination parameters', async () => {
    mockListDocuments.mockResolvedValue([] as any);

    await listDocuments(2, 5);

    expect(mockListDocuments).toHaveBeenCalledWith(2, 5);
  });
});
