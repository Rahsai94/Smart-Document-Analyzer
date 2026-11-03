import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

export type IndexingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  text: string;
  requiresOcr: boolean;
  pageCount?: number;
  uploadedAt: Date;
  indexingStatus: IndexingStatus;
  contentHash?: string;
  configVersion?: string;
  storagePath?: string;
}

export interface DocumentInput {
  filename: string;
  mimeType: string;
  size: number;
  text: string;
  requiresOcr: boolean;
  pageCount?: number;
  storagePath?: string;
}

// Global in-memory store for demo mode to ensure it survives API route executions in dev
declare global {
  // eslint-disable-next-line no-var
  var __demoDocumentStore: Map<string, DocumentRecord> | undefined;
}

const store = global.__demoDocumentStore || new Map<string, DocumentRecord>();
if (process.env.NODE_ENV !== 'production') {
  global.__demoDocumentStore = store;
}

const isDemoMode = () => {
    return process.env.USE_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function storeDocument(input: DocumentInput, userId?: string): Promise<DocumentRecord> {
  if (isDemoMode()) {
    // Simulate network delay for realistic demo
    await new Promise(resolve => setTimeout(resolve, 500));

    // Basic duplicate detection by filename and size
    const existingRecords = Array.from(store.values());
    for (const existingRecord of existingRecords) {
      if (existingRecord.filename === input.filename && existingRecord.size === input.size) {
        return existingRecord;
      }
    }

    const id = uuidv4();
    const record: DocumentRecord = {
      id,
      ...input,
      uploadedAt: new Date(),
      indexingStatus: 'pending'
    };

    store.set(id, record);
    return record;
  } else {
      if (!userId) {
          throw new Error('User ID is required for non-demo mode');
      }

      const supabase = createClient();
      const { data, error } = await supabase
          .from('documents')
          .insert({
              user_id: userId,
              filename: input.filename,
              storage_path: input.storagePath,
              mime_type: input.mimeType,
              size: input.size,
              text_content: input.text,
              requires_ocr: input.requiresOcr,
              page_count: input.pageCount,
              indexing_status: 'pending'
          })
          .select()
          .single();

      if (error) {
          throw new Error(`Failed to store document: ${error.message}`);
      }

      return {
          id: data.id,
          filename: data.filename,
          storagePath: data.storage_path,
          mimeType: data.mime_type,
          size: data.size,
          text: data.text_content,
          requiresOcr: data.requires_ocr,
          pageCount: data.page_count,
          uploadedAt: new Date(data.uploaded_at),
          indexingStatus: data.indexing_status,
          contentHash: data.content_hash,
          configVersion: data.config_version
      };
  }
}

export async function updateDocumentStatus(id: string, updates: Partial<Pick<DocumentRecord, 'indexingStatus' | 'contentHash' | 'configVersion'>>): Promise<void> {
  if (isDemoMode()) {
      const doc = await getDocument(id);
      if (doc) {
        Object.assign(doc, updates);
        store.set(id, doc);
      }
  } else {
      const supabase = createClient();
      const { error } = await supabase
          .from('documents')
          .update({
              indexing_status: updates.indexingStatus,
              content_hash: updates.contentHash,
              config_version: updates.configVersion
          })
          .eq('id', id);

      if (error) {
          throw new Error(`Failed to update document status: ${error.message}`);
      }
  }
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  if (isDemoMode()) {
      return store.get(id) || null;
  } else {
      const supabase = createClient();
      const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single();

      if (error) {
          if (error.code === 'PGRST116') {
              return null;
          }
          throw new Error(`Failed to get document: ${error.message}`);
      }

      return {
          id: data.id,
          filename: data.filename,
          storagePath: data.storage_path,
          mimeType: data.mime_type,
          size: data.size,
          text: data.text_content,
          requiresOcr: data.requires_ocr,
          pageCount: data.page_count,
          uploadedAt: new Date(data.uploaded_at),
          indexingStatus: data.indexing_status,
          contentHash: data.content_hash,
          configVersion: data.config_version
      };
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (isDemoMode()) {
      return store.delete(id);
  } else {
      const supabase = createClient();
      const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', id);

      if (error) {
          throw new Error(`Failed to delete document: ${error.message}`);
      }
      return true;
  }
}

export async function getAllDocuments(): Promise<DocumentRecord[]> {
  if (isDemoMode()) {
      return Array.from(store.values()).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  } else {
      const supabase = createClient();
      const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('uploaded_at', { ascending: false });

      if (error) {
          throw new Error(`Failed to get all documents: ${error.message}`);
      }

      return data.map(row => ({
          id: row.id,
          filename: row.filename,
          storagePath: row.storage_path,
          mimeType: row.mime_type,
          size: row.size,
          text: row.text_content,
          requiresOcr: row.requires_ocr,
          pageCount: row.page_count,
          uploadedAt: new Date(row.uploaded_at),
          indexingStatus: row.indexing_status,
          contentHash: row.content_hash,
          configVersion: row.config_version
      }));
  }
}

export async function getDocumentDownloadUrl(id: string): Promise<string | null> {
    if (isDemoMode()) {
        return null; // Not supported in demo mode
    }

    const doc = await getDocument(id);
    if (!doc || !doc.storagePath) {
        return null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(doc.storagePath, 60); // 60 seconds expiration

    if (error) {
        console.error("Failed to create signed URL:", error);
        return null;
    }

    return data.signedUrl;
}
