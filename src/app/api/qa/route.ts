import { NextRequest, NextResponse } from 'next/server';
import { GeminiAIProvider } from '@/lib/ai/gemini-provider';
import { MockAIProvider } from '@/lib/ai/mock-provider';
import { VectorStore } from '@/lib/document-processing/vector-store';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, documentIds, sessionId } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Valid query is required' }, { status: 400 });
    }

    const isDemoMode = process.env.USE_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let userId = '00000000-0000-0000-0000-000000000000';
    let currentSessionId = sessionId;
    let customClient = undefined;

    if (!isDemoMode) {
      const supabase = createClient();
      customClient = supabase;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;

      if (!currentSessionId) {
          const { data: session } = await supabase.from('chat_sessions').insert({
              user_id: userId,
              title: query.substring(0, 50) + '...'
          }).select().single();
          if (session) currentSessionId = session.id;
      }

      if (currentSessionId) {
          await supabase.from('chat_messages').insert({
              session_id: currentSessionId,
              user_id: userId,
              role: 'user',
              content: query
          });
      }
    }

    const useMock = process.env.USE_DEMO_MODE === 'true' || !process.env.GEMINI_API_KEY;
    const provider = useMock ? new MockAIProvider() : new GeminiAIProvider();

    // 1. Embed query
    const [queryEmbedding] = await provider.generateEmbeddings([query]);

    // 2. Retrieve chunks
    const vectorStore = new VectorStore(customClient);
    const retrievedChunks = await vectorStore.retrieveChunks({
      queryEmbedding,
      userId: userId,
      documentIds, // Optional: filter by specific documents
      topK: 5,
      matchThreshold: 0.6 // Slightly lower threshold to be forgiving
    });

    // 3. Generate Answer
    const answer = await provider.generateAnswer(query, retrievedChunks);

    if (!isDemoMode && currentSessionId) {
        const supabase = createClient();
        await supabase.from('chat_messages').insert({
            session_id: currentSessionId,
            user_id: userId,
            role: 'assistant',
            content: answer.answer,
            evidence: retrievedChunks
        });
    }

    return NextResponse.json({
      ...answer,
      evidence: retrievedChunks,
      sessionId: currentSessionId
    }, { status: 200 });

  } catch (error) {
    console.error('QA Error:', error);
    return NextResponse.json({ error: 'Internal server error during Q&A.' }, { status: 500 });
  }
}
