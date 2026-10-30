import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VectorChunk } from '../ai/types';
import { Chunk } from './chunker';
import { v4 as uuidv4 } from 'uuid';

export interface StoreChunkInput {
  documentId: string;
  userId: string;
  chunks: Chunk[];
  embeddings: number[][];
  contentHash: string;
  configVersion: string;
}

export interface RetrieveOptions {
  queryEmbedding: number[];
  userId: string;
  documentIds?: string[];
  topK?: number;
  matchThreshold?: number;
}

// In-memory store for demo/tests
declare global {
  // eslint-disable-next-line no-var
  var __demoVectorStore: VectorChunk[] | undefined;
}

const vectorStore = global.__demoVectorStore || [];
if (process.env.NODE_ENV !== 'production') {
  global.__demoVectorStore = vectorStore;
}

export class VectorStore {
  private supabase: SupabaseClient | null = null;
  private useDemoMode = false;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Fallback to demo mode if no valid keys are present or explicitly requested
    if (!supabaseUrl || !supabaseKey || process.env.USE_DEMO_MODE === 'true') {
      this.useDemoMode = true;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async storeChunks(input: StoreChunkInput): Promise<void> {
    if (this.useDemoMode) {
      this.storeChunksMock(input);
      return;
    }

    if (!this.supabase) throw new Error("Supabase client not initialized.");

    const rows = input.chunks.map((chunk, index) => ({
      document_id: input.documentId,
      user_id: input.userId,
      content: chunk.content,
      embedding: input.embeddings[index],
      metadata: chunk.metadata,
      content_hash: input.contentHash,
      config_version: input.configVersion,
    }));

    // Clear old chunks for this document before inserting new ones
    const { error: deleteError } = await this.supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', input.documentId);

    if (deleteError) {
      throw new Error(`Failed to clear old chunks: ${deleteError.message}`);
    }

    const { error } = await this.supabase
      .from('document_chunks')
      .insert(rows);

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }

  async retrieveChunks(options: RetrieveOptions): Promise<VectorChunk[]> {
    if (this.useDemoMode) {
      return this.retrieveChunksMock(options);
    }

    if (!this.supabase) throw new Error("Supabase client not initialized.");

    const { data, error } = await this.supabase.rpc('match_document_chunks', {
      query_embedding: options.queryEmbedding,
      match_threshold: options.matchThreshold ?? 0.7,
      match_count: options.topK ?? 5,
      p_user_id: options.userId,
      p_document_ids: options.documentIds
    });

    if (error) {
      throw new Error(`Failed to retrieve chunks: ${error.message}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map(row => ({
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      metadata: row.metadata
    }));
  }

  // --- Mock Implementations for testing/demo ---

  private storeChunksMock(input: StoreChunkInput) {
    const existing = vectorStore.filter(c =>
      c.documentId === input.documentId &&
      c.metadata.contentHash === input.contentHash &&
      c.metadata.configVersion === input.configVersion
    );

    if (existing.length > 0) return; // Prevent duplicates

    input.chunks.forEach((chunk, i) => {
      vectorStore.push({
        id: uuidv4(),
        documentId: input.documentId,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          contentHash: input.contentHash,
          configVersion: input.configVersion,
          userId: input.userId,
          embedding: input.embeddings[i]
        }
      });
    });
  }

  private retrieveChunksMock(options: RetrieveOptions): VectorChunk[] {
    const threshold = options.matchThreshold ?? 0.7;
    const topK = options.topK ?? 5;

    // Filter by user and document
    const filtered = vectorStore.filter(chunk => {
      if (chunk.metadata.userId !== options.userId) return false;
      if (options.documentIds && options.documentIds.length > 0 && !options.documentIds.includes(chunk.documentId)) return false;
      return true;
    });

    // Mock similarity (dot product)
    const scored = filtered.map(chunk => {
      const embedding = chunk.metadata.embedding as number[];
      let similarity = 0;
      if (embedding && options.queryEmbedding.length === embedding.length) {
        similarity = embedding.reduce((sum, val, i) => sum + val * options.queryEmbedding[i], 0);
      } else {
        // Fallback for missing/mismatched embeddings in mock
        similarity = 1.0;
      }
      return { chunk, similarity };
    });

    return scored
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(item => ({
        id: item.chunk.id,
        documentId: item.chunk.documentId,
        content: item.chunk.content,
        metadata: {
            ...item.chunk.metadata,
            embedding: undefined // omit embedding from result
        }
      }));
  }
}
