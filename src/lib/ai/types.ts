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

export interface AIProvider {
  generateInsights(
    text: string,
    documentId: string,
    contentHash: string
  ): Promise<GeneratedInsights>;
}
