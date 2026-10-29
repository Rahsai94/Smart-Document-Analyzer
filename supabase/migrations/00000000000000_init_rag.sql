-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create the document_chunks table
create table if not exists public.document_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null,
    user_id uuid not null,
    content text not null,
    embedding vector(768), -- Gemini text-embedding-004 outputs 768 dimensions by default
    metadata jsonb not null default '{}'::jsonb,
    content_hash text not null,
    config_version text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies
alter table public.document_chunks enable row level security;

create policy "Users can view their own document chunks"
    on public.document_chunks for select
    using (auth.uid() = user_id);

create policy "Users can insert their own document chunks"
    on public.document_chunks for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own document chunks"
    on public.document_chunks for update
    using (auth.uid() = user_id);

create policy "Users can delete their own document chunks"
    on public.document_chunks for delete
    using (auth.uid() = user_id);

-- Indexes for common filters
create index if not exists document_chunks_document_id_idx on public.document_chunks (document_id);
create index if not exists document_chunks_user_id_idx on public.document_chunks (user_id);

-- HNSW vector index for semantic search (requires vector extension)
-- Using inner product (vector_ip_ops) as it's typically recommended for normalized embeddings like OpenAI/Gemini
create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_ip_ops)
    with (m = 16, ef_construction = 64);


-- Function for similarity search
-- Retrieves chunks based on vector similarity, enforcing user ownership and document limits
create or replace function public.match_document_chunks (
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    p_user_id uuid,
    p_document_ids uuid[] default null
)
returns table (
    id uuid,
    document_id uuid,
    content text,
    metadata jsonb,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        dc.id,
        dc.document_id,
        dc.content,
        dc.metadata,
        -- using inner product since embeddings are typically normalized.
        -- Higher inner product means more similar (1 - inner product distance)
        1 - (dc.embedding <=> query_embedding) as similarity
    from
        public.document_chunks dc
    where
        dc.user_id = p_user_id -- Strict cross-user isolation
        and (p_document_ids is null or dc.document_id = any(p_document_ids))
        and 1 - (dc.embedding <=> query_embedding) > match_threshold
    order by
        dc.embedding <=> query_embedding -- Order by distance (closest first)
    limit match_count;
end;
$$;
