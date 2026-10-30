import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAIProvider } from './gemini-provider';

// Need to mock GoogleGenAI specifically for this test file
vi.mock('@google/genai', () => {
  return {
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', BOOLEAN: 'BOOLEAN', INTEGER: 'INTEGER' },
    GoogleGenAI: class {
      models = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        embedContent: vi.fn().mockImplementation(async (opts: any) => {
          if (opts.contents === 'error trigger') {
            throw new Error('API Timeout');
          }
          return {
             embeddings: [{ values: [0.1, 0.2, 0.3] }]
          };
        }),
        generateContent: vi.fn() // Just a stub for tests that don't need it
      };
    }
  };
});

describe('GeminiAIProvider - Embeddings', () => {
  let provider: GeminiAIProvider;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    provider = new GeminiAIProvider();
  });

  it('should generate embeddings successfully', async () => {
    const texts = ['Hello world', 'Second doc'];
    const results = await provider.generateEmbeddings(texts);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual([0.1, 0.2, 0.3]);
    expect(results[1]).toEqual([0.1, 0.2, 0.3]);
  });

  it('should handle API errors and propagate them', async () => {
    await expect(provider.generateEmbeddings(['error trigger'])).rejects.toThrow('API Timeout');
  });

  it('should handle empty input array', async () => {
    const results = await provider.generateEmbeddings([]);
    expect(results).toEqual([]);
  });
});
