import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/document-processing/storage';
import { GeminiAIProvider } from '@/lib/ai/gemini-provider';
import { MockAIProvider } from '@/lib/ai/mock-provider';
import { GeneratedInsights } from '@/lib/ai/types';
import crypto from 'crypto';

// In-memory cache for demo
declare global {
  // eslint-disable-next-line no-var
  var __insightsCache: Map<string, GeneratedInsights> | undefined;
}

const cache = global.__insightsCache || new Map<string, GeneratedInsights>();
if (process.env.NODE_ENV !== 'production') {
  global.__insightsCache = cache;
}

function getProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'placeholder_gemini_api_key' && apiKey.trim() !== '') {
    return new GeminiAIProvider();
  }
  console.log('Using MockAIProvider because GEMINI_API_KEY is not set or is a placeholder.');
  return new MockAIProvider();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const document = await getDocument(documentId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.requiresOcr && !document.text.trim()) {
        return NextResponse.json({ error: 'Document requires OCR and contains no readable text.' }, { status: 422 });
    }

    const contentHash = crypto.createHash('sha256').update(document.text).digest('hex');
    const cacheKey = `${documentId}-${contentHash}`;

    // Return cached insights if available
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const provider = getProvider();

    const insights = await provider.generateInsights(document.text, documentId, contentHash);

    // Cache the result
    cache.set(cacheKey, insights);

    return NextResponse.json(insights);
  } catch (error: unknown) {
    console.error('Insights Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Rate Limit') ? 429 : 500;
    return NextResponse.json({ error: errorMessage || 'Internal server error generating insights.' }, { status });
  }
}
