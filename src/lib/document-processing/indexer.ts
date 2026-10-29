import { getDocument, updateDocumentStatus } from './storage';
import { chunkText } from './chunker';
import { VectorStore } from './vector-store';
import { AIProvider } from '../ai/types';
import { createHash } from 'crypto';

export interface IndexerConfig {
  aiProvider: AIProvider;
  userId: string;
  chunkSize?: number;
  overlap?: number;
  maxRetries?: number;
}

const CONFIG_VERSION = 'v1.0.0';

export async function indexDocument(documentId: string, config: IndexerConfig): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  // Basic content hash
  const contentHash = createHash('sha256').update(doc.text).digest('hex');

  // Prevent duplicate work if it's already completed and unchanged
  if (doc.indexingStatus === 'completed' && doc.contentHash === contentHash && doc.configVersion === CONFIG_VERSION) {
    return;
  }

  await updateDocumentStatus(documentId, { indexingStatus: 'processing' });

  const maxRetries = config.maxRetries ?? 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const chunks = chunkText(doc.text, {
        chunkSize: config.chunkSize ?? 1000,
        overlap: config.overlap ?? 200
      });

      if (chunks.length === 0) {
        await updateDocumentStatus(documentId, { indexingStatus: 'completed', contentHash, configVersion: CONFIG_VERSION });
        return;
      }

      // Generate embeddings
      const texts = chunks.map(c => c.content);
      const embeddings = await config.aiProvider.generateEmbeddings(texts);

      // Store in vector database
      const vectorStore = new VectorStore();

      // Inject document name into chunk metadata to help AI citations
      const chunksWithMetadata = chunks.map(c => ({
          ...c,
          metadata: {
              ...c.metadata,
              documentName: doc.filename
          }
      }));

      await vectorStore.storeChunks({
        documentId,
        userId: config.userId,
        chunks: chunksWithMetadata,
        embeddings,
        contentHash,
        configVersion: CONFIG_VERSION
      });

      await updateDocumentStatus(documentId, { indexingStatus: 'completed', contentHash, configVersion: CONFIG_VERSION });
      return; // Success
    } catch (error) {
      attempt++;
      console.error(`Indexing attempt ${attempt} failed for document ${documentId}:`, error);

      if (attempt >= maxRetries) {
        await updateDocumentStatus(documentId, { indexingStatus: 'failed' });
        throw new Error(`Failed to index document after ${maxRetries} attempts`);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
