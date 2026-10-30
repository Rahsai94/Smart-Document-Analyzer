export interface ChunkMetadata {
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
  heading?: string;
  [key: string]: unknown;
}

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkerConfig {
  chunkSize: number;
  overlap: number;
}

export function chunkText(text: string, config: ChunkerConfig = { chunkSize: 1000, overlap: 200 }): Chunk[] {
  const { chunkSize, overlap } = config;
  const chunks: Chunk[] = [];

  if (!text) {
    return chunks;
  }

  if (chunkSize <= overlap) {
    throw new Error('chunkSize must be greater than overlap');
  }

  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex > text.length) {
      endIndex = text.length;
    } else {
      // Try to find a natural break point like a newline or period
      const lastNewline = text.lastIndexOf('\n', endIndex);
      const lastPeriod = text.lastIndexOf('.', endIndex);

      // If we find a breakpoint within the overlap window, use it
      const breakPoint = Math.max(lastNewline, lastPeriod);
      if (breakPoint > startIndex + chunkSize - overlap) {
        endIndex = breakPoint + 1;
      }
    }

    chunks.push({
      content: text.slice(startIndex, endIndex).trim(),
      metadata: {
        startIndex,
        endIndex
      }
    });

    startIndex = endIndex - overlap;

    if (startIndex < 0 || endIndex === text.length) {
        break;
    }
  }

  return chunks;
}
