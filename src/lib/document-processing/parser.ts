import mammoth from 'mammoth';

export interface ProcessedDocument {
  text: string;
  pageCount?: number;
  requiresOcr: boolean;
}

export async function processDocument(buffer: Buffer, mimeType: string): Promise<ProcessedDocument> {
  if (mimeType === 'application/pdf') {
    return processPdf(buffer);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return processDocx(buffer);
  } else if (mimeType === 'text/plain') {
    return processTxt(buffer);
  }

  throw new Error(`Unsupported mime type for parsing: ${mimeType}`);
}

async function processPdf(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer, { max: 0 });

    const text = normalizeText(data.text);
    const pageCount = data.numpages;

    // Heuristic for scanned PDF:
    // If there's text, but very little of it per page, it's likely scanned images with minimal hidden text or an entirely image-based PDF.
    // For example, if average characters per page < 50, flag as OCR required.
    const avgCharsPerPage = text.length / (pageCount || 1);
    const requiresOcr = text.trim().length === 0 || avgCharsPerPage < 50;

    return {
      text: requiresOcr ? '' : text,
      pageCount,
      requiresOcr
    };
  } catch {
    throw new Error('Failed to parse PDF');
  }
}

async function processDocx(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = normalizeText(result.value);

    return {
      text,
      requiresOcr: false // DOCX is generally not scanned in the same way PDFs are
    };
  } catch {
    throw new Error('Failed to parse DOCX');
  }
}

async function processTxt(buffer: Buffer): Promise<ProcessedDocument> {
  const text = buffer.toString('utf-8');
  return {
    text: normalizeText(text),
    requiresOcr: false
  };
}

function normalizeText(text: string): string {
  if (!text) return '';
  // Replace multiple newlines with a single newline to preserve paragraphs,
  // but strip excessive whitespace.
  return text
    .replace(/\r\n/g, '\n') // Normalize Windows newlines
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines in a row
    .trim();
}