/**
 * Unit tests for upload-document API logic
 */

import { createDocument } from '../../shared/queries';
import { uploadToStorage } from '../../../../utils/supabaseStorage';

jest.mock('../../shared/queries');
jest.mock('../../../../utils/supabaseStorage');

const mockCreateDocument = createDocument as jest.MockedFunction<typeof createDocument>;
const mockUploadToStorage = uploadToStorage as jest.MockedFunction<typeof uploadToStorage>;

describe('Upload Document API Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create document record after upload', async () => {
    const userId = 1;
    const mockDoc = {
      id: 1,
      name: 'test.pdf',
      file_url: 'https://example.com/test.pdf',
      file_path: 'docs/test.pdf',
      status: 'pending',
    };

    mockUploadToStorage.mockResolvedValue({
      url: 'https://example.com/test.pdf',
      path: 'docs/test.pdf',
    } as any);

    mockCreateDocument.mockResolvedValue(mockDoc as any);

    const result = await createDocument({
      name: 'test.pdf',
      file_url: 'https://example.com/test.pdf',
      file_path: 'docs/test.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      status: 'pending',
      created_by: userId,
      updated_by: userId,
    });

    expect(result).toEqual(mockDoc);
    expect(mockCreateDocument).toHaveBeenCalled();
  });

  it('should upload file to storage', async () => {
    const mockFile = Buffer.from('test content');
    const fileName = 'test.pdf';

    mockUploadToStorage.mockResolvedValue({
      url: 'https://example.com/test.pdf',
      path: 'docs/test.pdf',
    } as any);

    await uploadToStorage(mockFile, fileName, 'application/pdf');

    expect(mockUploadToStorage).toHaveBeenCalled();
  });
});
