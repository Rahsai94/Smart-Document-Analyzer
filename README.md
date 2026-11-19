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

## Supabase Integration (Auth, Database, Storage)

### Setup Instructions

1.  **Configure Environment Variables:**
    Update your `.env.local` file with the following variables:
    \`\`\`bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    USE_DEMO_MODE=false # Set to true to bypass authentication and use in-memory mock data
    \`\`\`

2.  **Run Migrations:**
    Apply the database schema using the Supabase CLI (if you have it installed and linked):
    \`\`\`bash
    supabase db push
    \`\`\`
    Alternatively, run the SQL files located in `supabase/migrations/` directly in your Supabase SQL Editor.

### Security and Storage Decisions

*   **Authentication:** The application leverages `@supabase/ssr` to handle Next.js App Router authentication securely using cookies. Protected API routes and pages will redirect to `/login` if a valid session is not detected (unless `USE_DEMO_MODE` is enabled).
*   **Database (Row Level Security - RLS):** RLS policies are strictly enforced on all tables (`documents`, `document_chunks`). Users can only insert, select, update, or delete records that match their `user_id`. This prevents cross-user data leakage.
*   **Storage:** A private storage bucket named `documents` is used to persist uploaded files. RLS policies on the `storage.objects` table ensure that users can only upload files to a folder corresponding to their `user_id` and can only read their own files.
*   **Service Role Key:** The `SUPABASE_SERVICE_ROLE_KEY` is kept server-side and is only used when absolute administrative access is necessary. Most database interactions utilize the user's session token and RLS.
