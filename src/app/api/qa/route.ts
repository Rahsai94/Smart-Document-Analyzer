import { NextRequest, NextResponse } from 'next/server';
import { GeminiAIProvider } from '@/lib/ai/gemini-provider';
import { MockAIProvider } from '@/lib/ai/mock-provider';
import { VectorStore } from '@/lib/document-processing/vector-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, documentIds } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Valid query is required' }, { status: 400 });
    }

    const useMock = process.env.USE_DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY;
    const provider = useMock ? new MockAIProvider() : new GeminiAIProvider();

    // In a real app, userId comes from auth session
    const mockUserId = '00000000-0000-0000-0000-000000000000';

    // 1. Embed query
    const [queryEmbedding] = await provider.generateEmbeddings([query]);

    // 2. Retrieve chunks
    const vectorStore = new VectorStore();
    const retrievedChunks = await vectorStore.retrieveChunks({
      queryEmbedding,
      userId: mockUserId,
      documentIds, // Optional: filter by specific documents
      topK: 5,
      matchThreshold: 0.6 // Slightly lower threshold to be forgiving
    });

    // 3. Generate Answer
    const answer = await provider.generateAnswer(query, retrievedChunks);

    return NextResponse.json({
      ...answer,
      evidence: retrievedChunks
    }, { status: 200 });

  } catch (error) {
    console.error('QA Error:', error);
    return NextResponse.json({ error: 'Internal server error during Q&A.' }, { status: 500 });
  }
}
