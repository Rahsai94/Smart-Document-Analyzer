import { AIProvider, GeneratedInsights, AnswerResponse, VectorChunk } from './types';

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

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Generate mock embeddings (e.g. zeros, or deterministically based on text length for testing)
    return texts.map(text => Array(768).fill(text.length / 1000));
  }

  async generateAnswer(query: string, retrievedChunks: VectorChunk[]): Promise<AnswerResponse> {
    if (retrievedChunks.length === 0) {
      return {
        answer: "I don't have enough information to answer that question.",
        citations: [],
        insufficientEvidence: true
      };
    }

    return {
      answer: "This is a mock answer based on the retrieved evidence.",
      citations: [
        {
          documentId: retrievedChunks[0].documentId,
          documentName: retrievedChunks[0].documentName || 'Mock Document',
          chunkId: retrievedChunks[0].id,
          excerpt: retrievedChunks[0].content.substring(0, 50) + "...",
          pageNumber: retrievedChunks[0].metadata.pageNumber as number | undefined
        }
      ],
      insufficientEvidence: false
    };
  }
}
