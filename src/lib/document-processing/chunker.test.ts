import { describe, it, expect } from 'vitest';
import { chunkText } from './chunker';

describe('Document Chunker', () => {
  it('should handle empty text', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('should create a single chunk if text is smaller than chunk size', () => {
    const text = 'This is a small text.';
    const chunks = chunkText(text, { chunkSize: 100, overlap: 20 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].metadata.startIndex).toBe(0);
    expect(chunks[0].metadata.endIndex).toBe(text.length);
  });

  it('should split text into multiple overlapping chunks', () => {
    const text = 'A'.repeat(100);
    const chunks = chunkText(text, { chunkSize: 40, overlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);

    // First chunk
    expect(chunks[0].metadata.startIndex).toBe(0);
    expect(chunks[0].metadata.endIndex).toBe(40);

    // Second chunk should overlap
    expect(chunks[1].metadata.startIndex).toBe(30);
    expect(chunks[1].metadata.endIndex).toBe(70);

    // Third chunk
    expect(chunks[2].metadata.startIndex).toBe(60);
    expect(chunks[2].metadata.endIndex).toBe(100);
  });

  it('should try to split at natural breakpoints like newlines', () => {
    const part1 = 'A'.repeat(30) + '\n';
    const part2 = 'B'.repeat(30) + '\n';
    const part3 = 'C'.repeat(30);
    const text = part1 + part2 + part3; // length 92

    // chunksize 40, overlap 15
    // first chunk would normally go to 40, but there's a newline at 30.
    // 30 > 40 - 15 (25), so it should break at 31 (after newline).

    const chunks = chunkText(text, { chunkSize: 40, overlap: 15 });

    expect(chunks[0].metadata.endIndex).toBe(31);
    expect(chunks[0].content).toBe('A'.repeat(30)); // trimmed

    // Next chunk starts at 31 - 15 = 16
    expect(chunks[1].metadata.startIndex).toBe(16);
  });
});
