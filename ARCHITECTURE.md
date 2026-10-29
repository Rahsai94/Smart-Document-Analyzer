# Architecture Decisions

## Document Ingestion and Parsing

**Decision:** Use Node-based parsers (`pdf-parse`, `mammoth`) within the Next.js service instead of a separate Python service (like `PyMuPDF` and `python-docx`).

**Rationale:**
1. **Deployment Simplicity:** The current architecture is a Next.js application. Introducing a separate Python service for document parsing adds significant deployment complexity (e.g., maintaining multiple services, managing inter-service communication, dealing with different deployment environments).
2. **Sufficiency of Node Libraries:** While Python libraries like `PyMuPDF` are powerful, Node.js libraries such as `pdf-parse` (for PDF text extraction) and `mammoth` (for DOCX) are sufficient for the required features (text extraction, basic metadata, preserving paragraphs).
3. **Scanned PDF Detection:** We can implement a heuristic in Node.js (e.g., checking the ratio of text length to file size/page count after parsing) to detect likely image-only documents and flag them as `requires_ocr`, fulfilling the requirement to handle scanned PDFs explicitly without needing heavy OCR libraries in the main web service.
4. **Performance:** Processing within the Next.js Route Handlers (or server actions) avoids network overhead between services for file transfer.

This approach adheres to the directive to "not introduce a second service unless necessary" while providing full support for the requested document types and features.
