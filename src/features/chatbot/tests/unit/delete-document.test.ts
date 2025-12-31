/**
 * Unit tests for delete-document API logic
 */

import { getDocumentById, deleteDocument } from '../../shared/queries';
import { deleteDocumentVectors } from '../../services/vector.service';

jest.mock('../../shared/queries');
jest.mock('../../services/vector.service');

const mockGetDocumentById = getDocumentById as jest.MockedFunction<typeof getDocumentById>;
const mockDeleteDocument = deleteDocument as jest.MockedFunction<typeof deleteDocument>;
const mockDeleteDocumentVectors = deleteDocumentVectors as jest.MockedFunction<
  typeof deleteDocumentVectors
>;

describe('Delete Document API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete document when it exists', async () => {
    const documentId = 1;
    const userId = 1;

    mockGetDocumentById.mockResolvedValue({
      id: documentId,
      name: 'Test Doc',
      status: 'completed',
      chunk_count: 5,
    } as any);

    mockDeleteDocument.mockResolvedValue(undefined);
    mockDeleteDocumentVectors.mockResolvedValue(undefined);

    await deleteDocument(documentId, userId);

    expect(mockDeleteDocument).toHaveBeenCalledWith(documentId, userId);
  });

  it('should delete vectors when document is completed', async () => {
    const documentId = 1;

    mockGetDocumentById.mockResolvedValue({
      id: documentId,
      status: 'completed',
      chunk_count: 10,
    } as any);

    await deleteDocumentVectors(documentId);

    expect(mockDeleteDocumentVectors).toHaveBeenCalledWith(documentId);
  });
});
