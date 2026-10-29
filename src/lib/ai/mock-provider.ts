import { AIProvider, GeneratedInsights } from './types';

export class MockAIProvider implements AIProvider {
  async generateInsights(
    text: string,
    documentId: string,
    contentHash: string
  ): Promise<GeneratedInsights> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simple insufficient content check
    if (text.trim().length < 50) {
      throw new Error('Insufficient content for analysis.');
    }

    return {
      executiveSummary: 'This is a mock executive summary generated for testing purposes. The document covers several important topics.',
      detailedSummary: '## Introduction\nThis mock detailed summary includes headings to demonstrate structure.\n\n## Main Content\nHere we discuss the primary themes of the uploaded document, ensuring we provide enough text to simulate a real response.\n\n## Conclusion\nThe document concludes with several key takeaways and next steps.',
      insights: {
        keyTakeaways: ['Mock takeaway 1', 'Mock takeaway 2'],
        importantDates: ['2023-01-01', '2023-12-31'],
        names: ['Jane Doe', 'John Smith'],
        organizations: ['Acme Corp', 'Globex'],
        numericalFigures: ['$1M', '42%'],
        actionItems: ['Review report', 'Schedule meeting']
      },
      metadata: {
        documentId,
        contentHash,
        promptVersion: 'v1.0-mock',
        modelIdentifier: 'mock-model-v1',
        generatedAt: new Date().toISOString()
      }
    };
  }
}
