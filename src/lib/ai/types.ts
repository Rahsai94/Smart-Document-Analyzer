import { z } from 'zod';

export const InsightSchema = z.object({
  keyTakeaways: z.array(z.string()).describe("List of key takeaways from the document"),
  importantDates: z.array(z.string()).describe("List of important dates found in the document"),
  names: z.array(z.string()).describe("List of people's names found in the document"),
  organizations: z.array(z.string()).describe("List of organizations or companies found in the document"),
  numericalFigures: z.array(z.string()).describe("List of important numerical figures or metrics found in the document"),
  actionItems: z.array(z.string()).describe("List of action items or next steps found in the document"),
});

export type Insights = z.infer<typeof InsightSchema>;

export interface InsightMetadata {
  documentId: string;
  contentHash: string;
  promptVersion: string;
  modelIdentifier: string;
  generatedAt: string;
}

export interface GeneratedInsights {
  executiveSummary: string;
  detailedSummary: string;
  insights: Insights;
  metadata: InsightMetadata;
}

export const CitationSchema = z.object({
  documentId: z.string().describe("The ID of the document."),
  documentName: z.string().describe("The name or title of the document."),
  pageNumber: z.number().optional().describe("The page number where the evidence is found, if available."),
  chunkId: z.string().describe("The ID of the specific text chunk used as evidence."),
  excerpt: z.string().describe("The relevant excerpt from the source text supporting the claim.")
});
export type Citation = z.infer<typeof CitationSchema>;

export const AnswerResponseSchema = z.object({
  answer: z.string().describe("The generated answer to the user's question."),
  citations: z.array(CitationSchema).describe("List of citations supporting factual claims in the answer."),
  insufficientEvidence: z.boolean().describe("True if the provided documents do not contain sufficient evidence to fully answer the question.")
});
export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;

export interface VectorChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
  documentName?: string;
}

export interface AIProvider {
  generateInsights(
    text: string,
    documentId: string,
    contentHash: string
  ): Promise<GeneratedInsights>;

  generateEmbeddings(texts: string[]): Promise<number[][]>;

  generateAnswer(query: string, retrievedChunks: VectorChunk[]): Promise<AnswerResponse>;
}
