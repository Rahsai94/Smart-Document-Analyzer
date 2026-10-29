# Smart Document Analyzer - Agent Guidelines

## Architecture
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui.
- **Backend:** Next.js Route Handlers.
- **Database:** Supabase (PostgreSQL with pgvector for semantic retrieval).
- **AI/LLM:** Google Gemini API.

## Coding Conventions
- Use TypeScript with strict mode enabled.
- Prefer server-side validation using typed interfaces.
- Build reusable UI primitives and adhere to the established design token system.
- Avoid unnecessary dependencies and overengineering.
- Features must be fully implemented and tested before claiming they work.

## Security Rules
- **NEVER** expose API keys or service-role secrets in client-side code.
- **NEVER** commit real credentials. Use placeholder variables in `.env.example`.

## Testing Instructions
- **Unit/Integration Tests:** Use Vitest. Run with `npm run test:unit`.
- **End-to-End Tests:** Use Playwright. Run with `npm run test:e2e`.
- **Linting & Type-Checking:** Run `npm run lint` and `npm run type-check`.
