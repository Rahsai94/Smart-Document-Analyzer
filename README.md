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
