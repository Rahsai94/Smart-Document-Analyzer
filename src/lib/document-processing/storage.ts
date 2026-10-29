import { v4 as uuidv4 } from 'uuid';

export interface DocumentRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  text: string;
  requiresOcr: boolean;
  pageCount?: number;
  uploadedAt: Date;
}

export interface DocumentInput {
  filename: string;
  mimeType: string;
  size: number;
  text: string;
  requiresOcr: boolean;
  pageCount?: number;
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

export async function storeDocument(input: DocumentInput): Promise<DocumentRecord> {
  // Simulate network delay for realistic demo
  await new Promise(resolve => setTimeout(resolve, 500));

  // Basic duplicate detection by filename and size
  const existingRecords = Array.from(store.values());
  for (const existingRecord of existingRecords) {
    if (existingRecord.filename === input.filename && existingRecord.size === input.size) {
      // Rather than replacing, we can optionally throw an error or just return the existing ID
      // To simulate "handling" a duplicate, we return a flag or just the existing record.
      // Assuming we simply want to avoid duplicates and return the previous one:
      return existingRecord;
    }
  }

  const id = uuidv4();
  const record: DocumentRecord = {
    id,
    ...input,
    uploadedAt: new Date()
  };

  store.set(id, record);
  return record;
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  return store.get(id) || null;
}

export async function deleteDocument(id: string): Promise<boolean> {
  return store.delete(id);
}

export async function getAllDocuments(): Promise<DocumentRecord[]> {
  return Array.from(store.values()).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}