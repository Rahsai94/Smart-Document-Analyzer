import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/document-processing/parser';
import { storeDocument } from '@/lib/document-processing/storage';
import { indexDocument } from '@/lib/document-processing/indexer';
import { GeminiAIProvider } from '@/lib/ai/gemini-provider';
import { MockAIProvider } from '@/lib/ai/mock-provider';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Validate mime type (basic)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic Bytes Verification (File Signature)
    const isValidSignature = verifyFileSignature(buffer, file.type);
    if (!isValidSignature) {
       return NextResponse.json({ error: 'Invalid file signature or malformed document.' }, { status: 400 });
    }

    // Process document (parse text, check OCR, etc.)
    let parsedData;
    try {
        parsedData = await processDocument(buffer, file.type);
    } catch (parseError) {
        console.error("Parse error:", parseError);
        return NextResponse.json({ error: 'Failed to parse document. The file might be malformed or corrupted.' }, { status: 422 });
    }

    // Store in demo storage
    const documentRecord = await storeDocument({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      text: parsedData.text,
      requiresOcr: parsedData.requiresOcr,
      pageCount: parsedData.pageCount
    });

    // Fire and forget indexing
    // Use MockProvider if demo mode or missing API key
    const useMock = process.env.USE_DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY;
    const provider = useMock ? new MockAIProvider() : new GeminiAIProvider();

    // In a real app, userId comes from session. Hardcoding for demo.
    const mockUserId = '00000000-0000-0000-0000-000000000000';

    indexDocument(documentRecord.id, {
      aiProvider: provider,
      userId: mockUserId
    }).catch(err => {
      console.error('Background indexing failed:', err);
    });

    return NextResponse.json({
      message: 'Upload successful',
      documentId: documentRecord.id,
      requiresOcr: parsedData.requiresOcr,
      pageCount: parsedData.pageCount
    }, { status: 200 });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal server error during upload.' }, { status: 500 });
  }
}


function verifyFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'application/pdf') {
        // %PDF-
        return buffer.length >= 5 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D;
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // PK.. (ZIP archive)
        return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    if (mimeType === 'text/plain') {
        // Harder to verify signatures for TXT, just check if it's mostly printable characters or valid UTF-8
        // For simplicity and demo purposes, we'll accept it if we got this far and it's not a binary header we know
        return true;
    }

    return false;
}
