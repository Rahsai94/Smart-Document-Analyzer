import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorStore } from './vector-store';
import { Chunk } from './chunker';
import { v4 as uuidv4 } from 'uuid';

describe('VectorStore (Demo Mode)', () => {
  let vectorStore: VectorStore;

  beforeEach(() => {
    // Ensure demo mode is forced
    process.env.USE_DEMO_MODE = 'true';
    global.__demoVectorStore = []; // clear global state
    vectorStore = new VectorStore();
  });

  afterEach(() => {
    delete process.env.USE_DEMO_MODE;
  });

  it('should store and retrieve chunks for a user', async () => {
    const userId = uuidv4();
    const documentId = uuidv4();

    const chunks: Chunk[] = [
      { content: 'Chunk 1', metadata: { startIndex: 0, endIndex: 10 } },
      { content: 'Chunk 2', metadata: { startIndex: 10, endIndex: 20 } }
    ];

    // Mock embeddings
    const embeddings = [[1, 0, 0], [0, 1, 0]]; // simplified dimensions for mock

    await vectorStore.storeChunks({
      documentId,
      userId,
      chunks,
      embeddings,
      contentHash: 'hash1',
      configVersion: 'v1'
    });

    // Query matching Chunk 1
    const retrieved = await vectorStore.retrieveChunks({
      queryEmbedding: [0.9, 0.1, 0],
      userId,
      topK: 1,
      matchThreshold: 0.5
    });

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].content).toBe('Chunk 1');
    expect(retrieved[0].documentId).toBe(documentId);
  });

  it('should prevent cross-user access', async () => {
    const userId1 = uuidv4();
    const userId2 = uuidv4();
    const documentId = uuidv4();

    const chunks: Chunk[] = [
      { content: 'Secret Content', metadata: { startIndex: 0, endIndex: 10 } }
    ];

    await vectorStore.storeChunks({
      documentId,
      userId: userId1,
      chunks,
      embeddings: [[1, 1, 1]],
      contentHash: 'hash',
      configVersion: 'v1'
    });

    // User 2 tries to query
    const retrieved = await vectorStore.retrieveChunks({
      queryEmbedding: [1, 1, 1],
      userId: userId2
    });

    expect(retrieved).toHaveLength(0); // Should not see User 1's chunks
  });
});
