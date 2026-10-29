# Smart Document Analyzer

A production-minded portfolio project built to empower users to upload, summarize, and query documents with evidence-based citations.

## Planned Features

- **Document Upload & Storage:** Securely upload and manage private documents via Supabase.
- **Intelligent Summarization:** Generate comprehensive summaries of your documents using Google Gemini AI.
- **Structured Extraction:** Automatically extract key entities, dates, and terms.
- **Evidence-Based Q&A:** Ask questions about your documents and get answers with citations via semantic retrieval (pgvector).

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Supabase (PostgreSQL, pgvector)
- **AI Integration:** Google Gemini API
- **Testing:** Vitest (Unit/Integration) & Playwright (E2E)

## Retrieval-Augmented Generation (RAG) Architecture

The intelligent Q&A feature utilizes a RAG pipeline to ensure accurate, cited answers based solely on your uploaded documents.

**How it works:**
1. **Ingestion & Indexing:** Documents are parsed and split into small, overlapping chunks. We use the Gemini `text-embedding-004` model to convert these chunks into vector embeddings, which are stored securely in PostgreSQL using `pgvector`.
2. **Retrieval:** When you ask a question, it is also embedded into a vector. We perform a similarity search in the database to retrieve the most relevant chunks, heavily constrained by user ownership filters to prevent cross-user data leakage.
3. **Answer Generation:** The retrieved evidence is passed to the Gemini model. The model is strictly instructed to generate an answer *only* from the provided evidence and to cite the specific document and chunk for every factual claim.

**Limitations:**
- The quality of the answer depends on the retrieved chunks. If the similarity search fails to surface the relevant text, the model will state it has insufficient evidence.
- Context windows limit how many chunks can be used at once (typically the top K results).

## Notes on Gemini AI Implementation

The application uses `@google/genai` to generate insights and answers. Features include:
- Generating structured JSON insights using Zod schema verification.
- Document chunking for processing long texts while respecting token limits.
- Robust error handling for rate limiting and API timeouts.
- A deterministic mock provider for testing without consuming API quota or running tests with missing API keys.

## Setup Instructions

1. **Clone the repository:**
   \`\`\`bash
   git clone <repository_url>
   cd smart-document-analyzer
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure Environment Variables:**
   Copy the example environment file and fill in the placeholders with your actual API keys and secrets. **Never commit the actual `.env` file.**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

4. **Run the Development Server:**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Testing & Validation:**
   - Type Checking: \`npm run type-check\`
   - Linting: \`npm run lint\`
   - Unit Tests: \`npm run test:unit\`
   - E2E Tests: \`npm run test:e2e\`
