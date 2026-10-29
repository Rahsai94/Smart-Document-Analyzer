import { describe, it, expect, vi, beforeEach } from 'vitest';
import { indexDocument } from './indexer';
import * as storage from './storage';
import { MockAIProvider } from '../ai/mock-provider';
import { DocumentRecord } from './storage';

// Mock vector store
vi.mock('./vector-store', () => {
  return {
    VectorStore: class {
      storeChunks = vi.fn().mockResolvedValue(undefined);
    }
  };
});

describe('Document Indexer', () => {
  const documentId = 'doc-123';
  const mockDoc: DocumentRecord = {
    id: documentId,
    filename: 'test.pdf',
    mimeType: 'application/pdf',
    size: 100,
    text: 'This is a test document with some text to chunk and index.',
    requiresOcr: false,
    uploadedAt: new Date(),
    indexingStatus: 'pending'
  };

  beforeEach(() => {
    vi.spyOn(storage, 'getDocument').mockResolvedValue(mockDoc);
    vi.spyOn(storage, 'updateDocumentStatus').mockResolvedValue(undefined);
  });

  it('should successfully index a document and update status', async () => {
    const provider = new MockAIProvider();

    await indexDocument(documentId, { aiProvider: provider, userId: 'user1' });

    expect(storage.updateDocumentStatus).toHaveBeenCalledWith(documentId, { indexingStatus: 'processing' });
    expect(storage.updateDocumentStatus).toHaveBeenCalledWith(documentId, expect.objectContaining({ indexingStatus: 'completed' }));
  });

  it('should handle retries on failure', async () => {
    const provider = new MockAIProvider();
    vi.spyOn(provider, 'generateEmbeddings')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([[0.1]]);

    await indexDocument(documentId, { aiProvider: provider, userId: 'user1', maxRetries: 2 });

    expect(provider.generateEmbeddings).toHaveBeenCalledTimes(2);
    expect(storage.updateDocumentStatus).toHaveBeenCalledWith(documentId, expect.objectContaining({ indexingStatus: 'completed' }));
  });

  it('should set status to failed after max retries', async () => {
    const provider = new MockAIProvider();
    vi.spyOn(provider, 'generateEmbeddings').mockRejectedValue(new Error('Persistent error'));

    await expect(indexDocument(documentId, { aiProvider: provider, userId: 'user1', maxRetries: 2 })).rejects.toThrow();

    expect(provider.generateEmbeddings).toHaveBeenCalledTimes(2);
    expect(storage.updateDocumentStatus).toHaveBeenCalledWith(documentId, { indexingStatus: 'failed' });
  });
});
