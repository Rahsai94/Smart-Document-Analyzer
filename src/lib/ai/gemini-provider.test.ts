import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAIProvider } from './gemini-provider';

// Mock the environment variable
process.env.GEMINI_API_KEY = 'test_key';

// Create a mock for GoogleGenAI
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
    class MockGoogleGenAI {
        models = {
            generateContent: mockGenerateContent
        };
    }
    return {
        GoogleGenAI: MockGoogleGenAI,
        Type: {
            OBJECT: 'object',
            ARRAY: 'array',
            STRING: 'string'
        }
    };
});

describe('GeminiAIProvider', () => {
    let provider: GeminiAIProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new GeminiAIProvider();
    });

    it('should throw an error for insufficient content', async () => {
        await expect(provider.generateInsights('short text', 'doc1', 'hash1')).rejects.toThrowError(
            'Insufficient content for analysis. The document must contain at least 50 characters of readable text.'
        );
    });

    it('should extract insights and validate with Zod correctly', async () => {
        const text = 'A'.repeat(100); // Pass length check

        // Mock responses for the 3 parallel calls
        mockGenerateContent
            .mockResolvedValueOnce({ text: 'Executive Summary mock' }) // executive summary
            .mockResolvedValueOnce({ text: '## Detailed Summary mock' }) // detailed summary
            .mockResolvedValueOnce({
                text: JSON.stringify({
                    keyTakeaways: ['Takeaway 1'],
                    importantDates: ['2024-01-01'],
                    names: ['Alice'],
                    organizations: ['Corp'],
                    numericalFigures: ['100'],
                    actionItems: ['Do it']
                })
            }); // extract insights

        const insights = await provider.generateInsights(text, 'doc1', 'hash1');

        expect(insights.executiveSummary).toBe('Executive Summary mock');
        expect(insights.detailedSummary).toBe('## Detailed Summary mock');
        expect(insights.insights.names).toContain('Alice');
        expect(insights.insights.numericalFigures).toContain('100');
    });

    it('should chunk large texts and combine results', async () => {
        const CHUNK_SIZE = 40000;
        const text = 'A'.repeat(CHUNK_SIZE + 100); // Will create 2 chunks

        // For 2 chunks, we need to mock:
        // 2x intermediate exec summary + 1x final exec summary = 3 calls
        // 2x intermediate detailed summary + 1x final detailed summary = 3 calls
        // 2x extract insights = 2 calls
        // Since Promise.all runs them concurrently, we mock a generic response or sequence carefully.

        // Easier approach for this test is to provide a default mock for all calls
        mockGenerateContent.mockImplementation(async (args) => {
            if (args.config?.responseMimeType === 'application/json') {
                return {
                    text: JSON.stringify({
                        keyTakeaways: ['Takeaway'],
                        importantDates: [], names: [], organizations: [], numericalFigures: [], actionItems: []
                    })
                };
            }
            return { text: 'Mock text response' };
        });

        const insights = await provider.generateInsights(text, 'doc2', 'hash2');

        expect(insights.executiveSummary).toBe('Mock text response');

        // Count calls:
        // exec: 2 intermediate + 1 final = 3
        // detailed: 2 intermediate + 1 final = 3
        // extract: 2 intermediate = 2
        // Total = 8 calls
        expect(mockGenerateContent).toHaveBeenCalledTimes(8);
    });

    it('should handle rate limit errors correctly', async () => {
        const text = 'A'.repeat(100);

        mockGenerateContent.mockRejectedValueOnce(new Error('Rate Limit Exceeded'));

        await expect(provider.generateInsights(text, 'doc3', 'hash3')).rejects.toThrowError(
            'AI Provider Rate Limit Exceeded. Please try again later.'
        );
    });
});
