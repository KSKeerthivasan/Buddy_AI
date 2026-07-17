import { evidenceEngine } from '../evidenceEngine';
import { evidenceRepository } from '../../../repositories/evidenceRepository';
import { storage } from '../../../config/firebase';

jest.mock('../../../repositories/evidenceRepository');
jest.mock('../../../config/firebase', () => ({
  storage: {
    bucket: jest.fn()
  }
}));

describe('evidenceEngine', () => {
  const mockFileBuffer = Buffer.from('mock-file-content');
  const validSize = 10 * 1024 * 1024; // 10MB
  const validMimeType = 'image/png';
  const originalName = 'test.png';
  const mockUserId = 'user1';
  const mockTaskId = 'task1';
  const mockSessionId = 'session1';

  let mockFileSave: jest.Mock;
  let mockFileDelete: jest.Mock;
  let mockBucketFile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFileSave = jest.fn().mockResolvedValue(undefined);
    mockFileDelete = jest.fn().mockResolvedValue(undefined);
    
    mockBucketFile = jest.fn().mockReturnValue({
      save: mockFileSave,
      delete: mockFileDelete,
      getSignedUrl: jest.fn().mockResolvedValue(['http://mock-url.com'])
    });
    
    (storage.bucket as jest.Mock).mockReturnValue({
      file: mockBucketFile
    });
  });

  it('rejects files larger than 20MB', async () => {
    const oversize = 21 * 1024 * 1024;
    await expect(evidenceEngine.uploadEvidence(
      mockFileBuffer, oversize, validMimeType, originalName, mockUserId, mockTaskId, mockSessionId
    )).rejects.toThrow('File size exceeds the 20MB limit.');
  });

  it('rejects unsupported mime types', async () => {
    await expect(evidenceEngine.uploadEvidence(
      mockFileBuffer, validSize, 'application/xml', originalName, mockUserId, mockTaskId, mockSessionId
    )).rejects.toThrow('Unsupported file type: application/xml');
  });

  it('uploads valid files and stores metadata', async () => {
    (evidenceRepository.createEvidence as jest.Mock).mockResolvedValue(undefined);
    (evidenceRepository.updateEvidenceStatus as jest.Mock).mockResolvedValue(undefined);

    const evidence = await evidenceEngine.uploadEvidence(
      mockFileBuffer, validSize, validMimeType, originalName, mockUserId, mockTaskId, mockSessionId
    );

    expect(evidence.fileName).toBe(originalName);
    expect(evidence.status).toBe('UPLOADED');
    expect(evidenceRepository.createEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'UPLOADING' })
    );
    expect(mockFileSave).toHaveBeenCalled();
    expect(evidenceRepository.updateEvidenceStatus).toHaveBeenCalledWith(evidence.evidenceId, 'UPLOADED');
  });

  it('marks evidence as FAILED if Firebase Storage upload fails', async () => {
    (evidenceRepository.createEvidence as jest.Mock).mockResolvedValue(undefined);
    mockFileSave.mockRejectedValue(new Error('Storage Error'));

    await expect(evidenceEngine.uploadEvidence(
      mockFileBuffer, validSize, validMimeType, originalName, mockUserId, mockTaskId, mockSessionId
    )).rejects.toThrow('Storage Error');

    expect(evidenceRepository.updateEvidenceStatus).toHaveBeenCalledWith(expect.any(String), 'FAILED');
  });

  it('deletes evidence successfully', async () => {
    (evidenceRepository.getEvidenceById as jest.Mock).mockResolvedValue({
      evidenceId: 'ev1',
      storagePath: 'evidence/user1/session1/ev1-test.png',
      status: 'UPLOADED'
    });

    await evidenceEngine.deleteEvidence('ev1');
    expect(mockBucketFile).toHaveBeenCalledWith('evidence/user1/session1/ev1-test.png');
    expect(mockFileDelete).toHaveBeenCalled();
    expect(evidenceRepository.updateEvidenceStatus).toHaveBeenCalledWith('ev1', 'DELETED');
  });
});
