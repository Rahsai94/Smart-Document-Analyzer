import { GoogleGenAI, Type } from '@google/genai';
import { AIProvider, GeneratedInsights, InsightSchema } from './types';

// Approximate characters to stay within a reasonable token limit (e.g., ~4 chars per token)
// Using 40,000 characters to comfortably fit within smaller Gemini model windows if necessary
const CHUNK_SIZE = 40000;
const MODEL_NAME = 'gemini-2.5-flash';
const PROMPT_VERSION = 'v1.0.0';

export class GeminiAIProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateInsights(
    text: string,
    documentId: string,
    contentHash: string
  ): Promise<GeneratedInsights> {
    if (text.trim().length < 50) {
      throw new Error('Insufficient content for analysis. The document must contain at least 50 characters of readable text.');
    }

    try {
      const chunks = this.chunkText(text, CHUNK_SIZE);

      const [executiveSummary, detailedSummary, insights] = await Promise.all([
        this.generateExecutiveSummaryWithChunking(chunks),
        this.generateDetailedSummaryWithChunking(chunks),
        this.extractKeyInsightsWithChunking(chunks)
      ]);

      return {
        executiveSummary,
        detailedSummary,
        insights,
        metadata: {
          documentId,
          contentHash,
          promptVersion: PROMPT_VERSION,
          modelIdentifier: MODEL_NAME,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const errorStatus = typeof error === 'object' && error !== null && 'status' in error ? (error as {status: number}).status : undefined;
      const errorName = error instanceof Error ? error.name : '';

      if (errorStatus === 429 || errorMessage.toLowerCase().includes('rate limit')) {
        throw new Error('AI Provider Rate Limit Exceeded. Please try again later.');
      }
      if (errorName === 'AbortError' || errorMessage.toLowerCase().includes('timeout')) {
        throw new Error('AI Provider Timeout. The document might be too large or the service is busy.');
      }
      throw error;
    }
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async generateExecutiveSummaryWithChunking(chunks: string[]): Promise<string> {
    if (chunks.length === 1) {
      return this.generateExecutiveSummary(chunks[0]);
    }

    const intermediateSummaries = await Promise.all(
      chunks.map((chunk, index) => this.generateExecutiveSummary(`[Part ${index + 1}/${chunks.length}]\n${chunk}`))
    );

    const combinedText = intermediateSummaries.join('\n\n---\n\n');
    return this.generateExecutiveSummary(`The following are summaries of parts of a document. Create a cohesive final executive summary from these parts.\n\n${combinedText}`);
  }

  private async generateDetailedSummaryWithChunking(chunks: string[]): Promise<string> {
    if (chunks.length === 1) {
      return this.generateDetailedSummary(chunks[0]);
    }

    const intermediateSummaries = await Promise.all(
      chunks.map((chunk, index) => this.generateDetailedSummary(`[Part ${index + 1}/${chunks.length}]\n${chunk}`))
    );

    const combinedText = intermediateSummaries.join('\n\n---\n\n');
    return this.generateDetailedSummary(`The following are detailed summaries of parts of a document. Combine them into a single comprehensive detailed summary using Markdown headings.\n\n${combinedText}`);
  }

  private async extractKeyInsightsWithChunking(chunks: string[]) {
    if (chunks.length === 1) {
      return this.extractKeyInsights(chunks[0]);
    }

    const intermediateInsights = await Promise.all(
      chunks.map(chunk => this.extractKeyInsights(chunk))
    );

    // Merge insights
    const combined = {
      keyTakeaways: new Set<string>(),
      importantDates: new Set<string>(),
      names: new Set<string>(),
      organizations: new Set<string>(),
      numericalFigures: new Set<string>(),
      actionItems: new Set<string>()
    };

    for (const insight of intermediateInsights) {
      insight.keyTakeaways.forEach(item => combined.keyTakeaways.add(item));
      insight.importantDates.forEach(item => combined.importantDates.add(item));
      insight.names.forEach(item => combined.names.add(item));
      insight.organizations.forEach(item => combined.organizations.add(item));
      insight.numericalFigures.forEach(item => combined.numericalFigures.add(item));
      insight.actionItems.forEach(item => combined.actionItems.add(item));
    }

    return {
      keyTakeaways: Array.from(combined.keyTakeaways),
      importantDates: Array.from(combined.importantDates),
      names: Array.from(combined.names),
      organizations: Array.from(combined.organizations),
      numericalFigures: Array.from(combined.numericalFigures),
      actionItems: Array.from(combined.actionItems)
    };
  }

  private async generateExecutiveSummary(text: string): Promise<string> {
    const prompt = `Generate a concise executive summary of the following document. Do not fabricate facts.\n\nDocument:\n${text}`;

    const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.2 }
    });

    if (!response.text) {
        throw new Error('Failed to generate executive summary.');
    }
    return response.text;
  }

  private async generateDetailedSummary(text: string): Promise<string> {
    const prompt = `Generate a detailed summary of the following document using Markdown headings. Do not fabricate facts.\n\nDocument:\n${text}`;

    const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.3 }
    });

    if (!response.text) {
        throw new Error('Failed to generate detailed summary.');
    }
    return response.text;
  }

  private async extractKeyInsights(text: string) {
    const prompt = `Extract the following structured information from the document. Do not fabricate facts. If a category is missing, provide an empty array.\n\nDocument:\n${text}`;

    const response = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    keyTakeaways: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of key takeaways from the document"
                    },
                    importantDates: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of important dates found in the document"
                    },
                    names: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of people's names found in the document"
                    },
                    organizations: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of organizations or companies found in the document"
                    },
                    numericalFigures: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of important numerical figures or metrics found in the document"
                    },
                    actionItems: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "List of action items or next steps found in the document"
                    }
                },
                required: ["keyTakeaways", "importantDates", "names", "organizations", "numericalFigures", "actionItems"]
            }
        }
    });

    if (!response.text) {
        throw new Error('Failed to extract key insights.');
    }

    try {
        const parsed = JSON.parse(response.text);
        return InsightSchema.parse(parsed);
    } catch {
        throw new Error('Failed to validate extracted insights against schema.');
    }
  }
}
