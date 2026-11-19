import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/document-processing/storage';
import { GeminiAIProvider } from '@/lib/ai/gemini-provider';
import { MockAIProvider } from '@/lib/ai/mock-provider';
import { GeneratedInsights } from '@/lib/ai/types';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

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
    const isDemoMode = process.env.USE_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let userId = null;

    if (!isDemoMode) {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    const documentId = params.id;
    const document = await getDocument(documentId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.requiresOcr && !document.text.trim()) {
        return NextResponse.json({ error: 'Document requires OCR and contains no readable text.' }, { status: 422 });
    }

    const contentHash = crypto.createHash('sha256').update(document.text).digest('hex');

    if (!isDemoMode && userId) {
        const supabase = createClient();
        const { data: existingInsights } = await supabase
            .from('document_insights')
            .select('*')
            .eq('document_id', documentId)
            .eq('content_hash', contentHash)
            .single();

        if (existingInsights) {
            const cached: GeneratedInsights = {
                executiveSummary: existingInsights.summary,
                detailedSummary: existingInsights.summary, // using summary for both in db schema for simplicity
                insights: {
                    keyTakeaways: [],
                    importantDates: existingInsights.dates || [],
                    names: existingInsights.entities || [],
                    organizations: [],
                    numericalFigures: [],
                    actionItems: []
                },
                metadata: {
                    documentId,
                    contentHash,
                    promptVersion: "1",
                    modelIdentifier: "db",
                    generatedAt: new Date().toISOString()
                }
            };
            return NextResponse.json(cached);
        }
    } else {
        const cacheKey = `${documentId}-${contentHash}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }
    }

    const provider = getProvider();

    const insights = await provider.generateInsights(document.text, documentId, contentHash);

    if (!isDemoMode && userId) {
        const supabase = createClient();
        await supabase.from('document_insights').insert({
            document_id: documentId,
            user_id: userId,
            summary: insights.executiveSummary,
            entities: insights.insights.names,
            dates: insights.insights.importantDates,
            content_hash: contentHash
        });
    } else {
        const cacheKey = `${documentId}-${contentHash}`;
        cache.set(cacheKey, insights);
    }

    return NextResponse.json(insights);
  } catch (error: unknown) {
    console.error('Insights Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Rate Limit') ? 429 : 500;
    return NextResponse.json({ error: errorMessage || 'Internal server error generating insights.' }, { status });
  }
}
